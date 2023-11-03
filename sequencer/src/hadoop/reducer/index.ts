import { createInterface } from 'readline';
import { RollupBase, RollupProofBase } from '@ycryptx/rollup';
import { logger } from '../utils';

// TODO: move this to a shared types file
type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProofBase;
  skipped?: boolean;
};

export const reducer = async (
  rollup: RollupBase,
  proof: RollupProofBase,
): Promise<void> => {
  let compiled = false;

  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  const intermediateProofs: {
    [partition: string]: {
      proofs: OrderedAccumulatedProof[];
      accumulated?: RollupProofBase;
    };
  } = {};

  for await (const line of rl) {
    const [_partitionKey, lineNumber, proofString] = line.split('\t');

    logger('reducer', `got proof ${lineNumber}, partition ${_partitionKey}`);

    const _lineNumber = parseInt(lineNumber);
    if (!compiled) {
      logger('reducer', `compiling zkapp`);
      try {
        await rollup.compile();
      } catch (err) {
        logger('reducer', `failed compiling zkapp`);
        throw err;
      }
      logger('reducer', `finished compiling zkapp`);
      compiled = true;
    }
    if (!partitionKey) {
      partitionKey = _partitionKey;
    }

    const deserializedProof = proof.fromJSON(JSON.parse(proofString));
    const orderedProofToAdd = {
      proof: deserializedProof,
      order: _lineNumber,
    };
    if (!intermediateProofs[_partitionKey]) {
      intermediateProofs[_partitionKey] = {
        proofs: [orderedProofToAdd],
      };
      continue;
    }

    let proofs = intermediateProofs[_partitionKey].proofs;

    // push the proof to the array in-order
    for (let i = 0; i < proofs.length; i++) {
      if (proofs[i].order < _lineNumber) {
        continue;
      }
      proofs = proofs
        .slice(0, i)
        .concat([orderedProofToAdd])
        .concat(proofs.slice(i));
      break;
    }

    // try to merge consecutive proofs
    let current = 0;
    for (let i = 0; i < proofs.length - 1; i++) {
      if (proofs[i].order == proofs[i + 1].order + 1) {
        if (proofs[i].skipped) {
          continue;
        }
        proofs[i + 1].proof = await proofs[current].proof.merge(
          proofs[i + 1].proof,
        );
        proofs[i].skipped = true;
        current = i + 1;
      } else {
        current += 1;
      }
    }

    intermediateProofs[_partitionKey].proofs = proofs;
  }

  // proofs accumulated by partition
  const accumulatedProofs: OrderedAccumulatedProof[] = [];

  for (const partition of Object.keys(intermediateProofs)) {
    for (const orderedProof of intermediateProofs[partition].proofs) {
      logger(
        'reducer',
        `merging proof ${orderedProof.order} in partition ${partition}`,
      );
      if (orderedProof.skipped) {
        continue;
      }
      try {
        if (!intermediateProofs[partition].accumulated) {
          intermediateProofs[partition].accumulated = orderedProof.proof;
          continue;
        }
        intermediateProofs[partition].accumulated = await intermediateProofs[
          partition
        ].accumulated.merge(orderedProof.proof);
      } catch (err) {
        logger(
          'reducer',
          `failed merging proof ${orderedProof.order} in partition ${partition}`,
        );
        throw err;
      }
      logger('reducer', `finished merging proof ${orderedProof.order}`);
    }
    accumulatedProofs.push({
      order: parseInt(partition),
      proof: intermediateProofs[partition].accumulated,
    });
  }

  let result = '';
  for (const accumulatedProof of accumulatedProofs) {
    result += `${JSON.stringify(accumulatedProof)}\n`;
  }
  process.stdout.write(result);
  logger(
    'reducer',
    `done: partitions ${accumulatedProofs.map((p) => p.order)}`,
  );
  return;
};
