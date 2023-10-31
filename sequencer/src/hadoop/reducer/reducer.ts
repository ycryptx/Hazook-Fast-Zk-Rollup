import { createInterface } from 'readline';
import { RollupBase, RollupProofBase } from '@ycryptx/rollup';
import { logger } from '../utils';

// TODO: move this to a shared types file
type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProofBase;
};

export const reducer = async <
  Rollup extends RollupBase,
  RollupProof extends RollupProofBase,
>(): Promise<void> => {
  let compiled = false;
  let rollup: Rollup;

  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  const intermediateProofs: {
    [partition: string]: {
      proofs: OrderedAccumulatedProof[];
      accumulated?: RollupProof;
    };
  } = {};

  for await (const line of rl) {
    const [_partitionKey, lineNumber, proofString] = line.split('\t');
    logger('reducer', `got line ${lineNumber}, partition ${_partitionKey}`);

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

    let rp: RollupProof;

    const intermediateProof = rp.fromJSON(JSON.parse(proofString));
    intermediateProofs[_partitionKey].proofs.push({
      proof: intermediateProof,
      order: parseInt(lineNumber),
    });

    // TODO: see if moving the proof generation from within the line reading
    // speeds up the reducer
  }

  const accumulatedProofs: OrderedAccumulatedProof[] = [];

  for (const partition of Object.keys(intermediateProofs)) {
    intermediateProofs[partition].proofs = intermediateProofs[
      partition
    ].proofs.sort((entry1, entry2) => entry1.order - entry2.order);

    for (const orderedProof of intermediateProofs[partition].proofs) {
      logger('reducer', `proving a proof in partition ${partition}`);
      try {
        if (!intermediateProofs[partition].accumulated) {
          intermediateProofs[partition].accumulated =
            orderedProof.proof as RollupProof;
          continue;
        }
        intermediateProofs[partition].accumulated = (await intermediateProofs[
          partition
        ].accumulated.merge(orderedProof.proof)) as RollupProof;
      } catch (err) {
        logger('reducer', `failed proving a proof in partition ${partition}`);
        throw err;
      }
      logger('reducer', `proof finished`);
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
  logger('reducer', `done`);
  return;
};
