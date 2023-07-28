import { Field } from 'snarkyjs';
import { createInterface } from 'readline';
import { Rollup, RollupState } from '../common';

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

  let key = 0;
  const rl = createInterface({
    input: process.stdin,
  });
  for await (const line of rl) {
    if (!line) {
      continue;
    }
    const number = parseInt(line);
    const state = RollupState.createOneStep(Field(number));
    const proof = await Rollup.oneStep(state);
    const proofString = JSON.stringify(proof.toJSON());
    const mapOutput = `${key}\t${proofString}\n`;
    process.stdout.write(mapOutput);
    key += 1;
  }
};
