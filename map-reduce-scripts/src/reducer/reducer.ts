import { createInterface } from 'readline';
import { Rollup, RollupProof, RollupState } from '@ycryptx/rollup';

export const onNewProof = async (
  proofString: string,
  accumulatedProof: RollupProof,
): Promise<RollupProof> => {
  if (!proofString) {
    return accumulatedProof;
  }

  const proof = RollupProof.fromJSON(JSON.parse(proofString));

  if (!accumulatedProof) {
    return proof;
  }

  const currentState = new RollupState({
    initialRoot: accumulatedProof.publicInput.initialRoot,
    latestRoot: accumulatedProof.publicInput.latestRoot,
  });

  const newState = RollupState.createMerged(
    currentState,
    new RollupState({
      initialRoot: proof.publicInput.initialRoot,
      latestRoot: proof.publicInput.latestRoot,
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
    const [, , proofString] = line.split('\t');
    rollupProof = await onNewProof(proofString, rollupProof);
  }
  return onClosed(rollupProof);
};
