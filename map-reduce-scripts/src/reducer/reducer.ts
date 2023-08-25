import { createInterface } from 'readline';
import { Rollup, RollupProof, Accumulator } from '@ycryptx/rollup';
import { logger } from '../utils';

type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProof;
};

export const reducer = async (): Promise<void> => {
  let compiled = false;

  const accumulator = new Accumulator();
  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  const intermediateProofs: {
    [partition: string]: OrderedAccumulatedProof[];
  } = {};

  for await (const line of rl) {
    const [_partitionKey, lineNumber, proofString] = line.split('\t');
    logger('reducer', `got line ${lineNumber}, partition ${_partitionKey}`);

    if (!intermediateProofs[_partitionKey]) {
      intermediateProofs[_partitionKey] = [];
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
    intermediateProofs[_partitionKey].push({
      proof: intermediateProof,
      order: parseInt(lineNumber),
    });
  }

  for (const partition of Object.keys(intermediateProofs)) {
    const orderedIntermediateProofsPerPartition = intermediateProofs[partition]
      .sort((entry1, entry2) => entry1.order - entry2.order)
      .map((entry) => entry.proof);

    for (const proof of orderedIntermediateProofsPerPartition) {
      logger('reducer', `proving a proof in partition ${partition}`);
      try {
        await accumulator.addProof(proof);
      } catch (err) {
        logger('reducer', `failed proving a proof in partition ${partition}`);
        throw err;
      }
      logger('reducer', `proof finished`);
    }
    intermediateProofs[partition] = [
      { order: parseInt(partition), proof: accumulator.accumulatedProof },
    ];
  }

  let result = '';
  for (const partition of Object.keys(intermediateProofs)) {
    result += `${JSON.stringify(intermediateProofs[partition][0])}\n`;
  }
  process.stdout.write(result);
  return;
};
