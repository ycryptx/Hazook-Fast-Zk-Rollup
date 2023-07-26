import { createInterface } from 'readline';
import { Rollup, RollupProof, RollupState } from '../common';

let accumulatedProof: RollupProof;

const processData = async (line: string): Promise<void> => {
  const [, proofString] = line.split('\t');

  const proof = RollupProof.fromJSON(JSON.parse(proofString));

  if (!accumulatedProof) {
    accumulatedProof = proof;
    return;
  }

  const currentState = new RollupState({
    hashedSum: accumulatedProof.publicInput.hashedSum,
    sum: accumulatedProof.publicInput.sum,
  });

  const newState = RollupState.createMerged(
    currentState,
    new RollupState({
      hashedSum: proof.publicInput.hashedSum,
      sum: proof.publicInput.sum,
    }),
  );

  accumulatedProof = await Rollup.merge(newState, accumulatedProof, proof);
};

export const reducer = async (): Promise<void> => {
  const rl = createInterface({
    input: process.stdin,
  });

  const queue = [] as string[];

  let closed = false;

  await Rollup.compile();

  // fire an event on each line read from RL
  rl.on('line', async (line) => {
    queue.push(line);
  });

  // final event when the file is closed, to flush the final accumulated value
  rl.on('close', () => {
    closed = true;
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const line = queue.shift();
    if (line) {
      await processData(line);
    } else if (closed) {
      const accumulatedProofString = JSON.stringify(accumulatedProof.toJSON());
      process.stdout.write(accumulatedProofString);
      return;
    }
  }
};
