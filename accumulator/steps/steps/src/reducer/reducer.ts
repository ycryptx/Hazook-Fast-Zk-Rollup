import { createInterface } from 'readline';
import { Rollup, RollupProof, RollupState } from '../rollup';

const onNewLine = async (
  line: string,
  accumulatedProof: RollupProof,
): Promise<RollupProof> => {
  const [, proofString] = line.split('\t');

  if (!proofString) {
    return accumulatedProof;
  }

  const proof = RollupProof.fromJSON(JSON.parse(proofString));

  if (!accumulatedProof) {
    return proof;
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

  return accumulatedProof;
};

const onClosed = async (accumulatedProof: RollupProof): Promise<void> => {
  let accumulatedProofString = '';
  if (accumulatedProof) {
    accumulatedProofString = JSON.stringify(accumulatedProof.toJSON());
  }
  process.stdout.write(accumulatedProofString);
  return;
};

export const reducer = async (): Promise<void> => {
  await Rollup.compile();

  let rollupProof: RollupProof;
  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    rollupProof = await onNewLine(line, rollupProof);
  }
  return onClosed(rollupProof);
};
