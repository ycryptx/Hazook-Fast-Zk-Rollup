import { Field } from 'snarkyjs';
import { createInterface } from 'readline';
import { Rollup, RollupState } from '../common';

// const onNewLine = async (line: string, key: number): Promise<number> => {
//   if (!key) {
//     key = 0;
//   }

//   const number = parseInt(line);
//   const state = RollupState.createOneStep(Field(number));
//   const proof = await Rollup.oneStep(state);
//   const proofString = JSON.stringify(proof.toJSON());
//   const mapOutput = `${key}\t${proofString}\n`;
//   process.stdout.write(mapOutput);
//   return key + 1;
// };

// const onClosed = async (): Promise<void> => {
//   return;
// };

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

  let key = 0;
  const rl = createInterface({
    input: process.stdin,
  });
  for await (const line of rl) {
    const number = parseInt(line);
    const state = RollupState.createOneStep(Field(number));
    const proof = await Rollup.oneStep(state);
    const proofString = JSON.stringify(proof.toJSON());
    const mapOutput = `${key}\t${proofString}\n`;
    process.stdout.write(mapOutput);
    key += 1;
  }
};
