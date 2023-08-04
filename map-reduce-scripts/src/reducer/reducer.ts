import { createInterface } from 'readline';
import { Rollup, RollupProof, Accumulator } from '@ycryptx/rollup';

type OrderedAccumulatedProof = {
  order: number;
  proof: RollupProof;
};

const onClosed = async (
  partitionKey: number,
  accumulatedProof: RollupProof,
): Promise<void> => {
  let accumulatedProofString = '';
  const orderedProof: OrderedAccumulatedProof = {
    order: partitionKey,
    proof: accumulatedProof,
  };
  accumulatedProofString = JSON.stringify(orderedProof);

  process.stdout.write(accumulatedProofString);
  return;
};

export const reducer = async (): Promise<void> => {
  await Rollup.compile();

  const accumulator = new Accumulator();
  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  for await (const line of rl) {
    const [_partitionKey, sortingKey, proofString] = line.split(',');
    if (!partitionKey) {
      partitionKey = _partitionKey;
    }
    console.error(
      `Reducer: partitionKey=${_partitionKey}, sortingKey=${sortingKey}`,
    );
    const intermediateProof = RollupProof.fromJSON(JSON.parse(proofString));
    await accumulator.addProof(intermediateProof);
  }
  if (accumulator.accumulatedProof) {
    onClosed(parseInt(partitionKey), accumulator.accumulatedProof);
  }
  return;
};
