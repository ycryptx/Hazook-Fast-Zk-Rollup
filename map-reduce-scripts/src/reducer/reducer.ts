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
  let compiled = false;

  const accumulator = new Accumulator();
  const rl = createInterface({
    input: process.stdin,
  });
  let partitionKey: string;

  const unorderedIntermediateProofs: { order: number; proof: RollupProof }[] =
    [];

  for await (const line of rl) {
    const [_partitionKey, sortingKey, proofString] = line.split('\t');
    if (!compiled) {
      await Rollup.compile();
      compiled = true;
    }
    if (!partitionKey) {
      partitionKey = _partitionKey;
    }
    console.error(
      `Reducer: partitionKey=${_partitionKey}, sortingKey=${sortingKey}`,
    );
    const intermediateProof = RollupProof.fromJSON(JSON.parse(proofString));
    unorderedIntermediateProofs.push({
      proof: intermediateProof,
      order: parseInt(sortingKey),
    });
  }

  const orderedIntermediateProofs = unorderedIntermediateProofs
    .sort((entry1, entry2) => entry1.order - entry2.order)
    .map((entry) => entry.proof);

  for await (const proof of orderedIntermediateProofs) {
    await accumulator.addProof(proof);
  }

  if (accumulator.accumulatedProof) {
    onClosed(parseInt(partitionKey), accumulator.accumulatedProof);
  }
  return;
};
