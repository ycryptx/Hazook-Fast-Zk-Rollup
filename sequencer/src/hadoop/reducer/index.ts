import { createInterface } from 'readline';
import { RollupBase, RollupProofBase } from '@ycryptx/rollup';
import { logger } from '../utils';

// TODO: move this to a shared types file
type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProofBase;
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

    if (!intermediateProofs[_partitionKey]) {
      intermediateProofs[_partitionKey] = {
        proofs: [],
      };
    }

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

    const intermediateProof = proof.fromJSON(JSON.parse(proofString));
    intermediateProofs[_partitionKey].proofs.push({
      proof: intermediateProof,
      order: parseInt(lineNumber),
    });

    // TODO: see if moving the proof generation from within the line reading
    // speeds up the reducer
  }

  // proofs accumulated by partition
  const accumulatedProofs: OrderedAccumulatedProof[] = [];

  for (const partition of Object.keys(intermediateProofs)) {
    intermediateProofs[partition].proofs = intermediateProofs[
      partition
    ].proofs.sort((entry1, entry2) => entry1.order - entry2.order);

    for (const orderedProof of intermediateProofs[partition].proofs) {
      logger(
        'reducer',
        `merging proof ${orderedProof.order} in partition ${partition}`,
      );
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