import { createInterface } from 'readline';
import { Rollup, RollupProof, Accumulator } from '@ycryptx/rollup';
import { logger } from '../utils';

type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProof;
};

export const reducer = async (): Promise<void> => {
  let compiled = false;

  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  const intermediateProofs: {
    [partition: string]: {
      proofs: OrderedAccumulatedProof[];
      accumulator: Accumulator;
    };
  } = {};

  for await (const line of rl) {
    const [_partitionKey, lineNumber, proofString] = line.split('\t');
    logger('reducer', `got line ${lineNumber}, partition ${_partitionKey}`);

    if (!intermediateProofs[_partitionKey]) {
      intermediateProofs[_partitionKey] = {
        proofs: [],
        accumulator: new Accumulator(),
      };
    }

    if (!compiled) {
      logger('reducer', `compiling zkapp`);
      try {
        await Rollup.compile();
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
    const intermediateProof = RollupProof.fromJSON(JSON.parse(proofString));
    intermediateProofs[_partitionKey].proofs.push({
      proof: intermediateProof,
      order: parseInt(lineNumber),
    });
  }

  const accumulatedProofs: OrderedAccumulatedProof[] = [];

  for (const partition of Object.keys(intermediateProofs)) {
    intermediateProofs[partition].proofs = intermediateProofs[
      partition
    ].proofs.sort((entry1, entry2) => entry1.order - entry2.order);

    for (const orderedProof of intermediateProofs[partition].proofs) {
      logger('reducer', `proving a proof in partition ${partition}`);
      try {
        await intermediateProofs[partition].accumulator.addProof(
          orderedProof.proof,
        );
      } catch (err) {
        logger('reducer', `failed proving a proof in partition ${partition}`);
        throw err;
      }
      logger('reducer', `proof finished`);
    }
    accumulatedProofs.push({
      order: parseInt(partition),
      proof: intermediateProofs[partition].accumulator.accumulatedProof,
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
