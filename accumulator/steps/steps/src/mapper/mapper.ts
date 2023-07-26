import { createInterface } from 'readline';
import { Field } from 'snarkyjs';
import { Rollup, RollupState } from '../common';

export const mapper = async (): Promise<void> => {
  let key = 0;

  const rl = createInterface({
    input: process.stdin,
  });

  await Rollup.compile();

  for await (const line of rl) {
    const number = parseInt(line);

    const state = RollupState.createOneStep(Field(number));
    const proof = await Rollup.oneStep(state);
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(`${key}\t${proofString}\n`);
    key += 1;
  }
};
