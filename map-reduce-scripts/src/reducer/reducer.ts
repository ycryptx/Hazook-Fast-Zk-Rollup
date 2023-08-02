import { createInterface } from 'readline';
import { Rollup, RollupProof, Accumulator } from '@ycryptx/rollup';

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

  const accumulator = new Accumulator();
  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    const [pratitionKey, sortingKey, proofString] = line.split('\t');
    console.error(
      `Reducer: partitionKey=${pratitionKey}, sortingKey=${sortingKey}`,
    );
    const intermediateProof = RollupProof.fromJSON(JSON.parse(proofString));
    await accumulator.addProof(intermediateProof);
  }
  return onClosed(accumulator.accumulatedProof);
};
