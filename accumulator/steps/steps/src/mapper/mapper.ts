import { Field } from 'snarkyjs';
import { createInterface } from 'readline';
import { Rollup, RollupState } from '../rollup';

const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUM_REDUCERS = 2;

let currentReducer = 0;

const deriveKey = (): string => {
  const key = `${currentReducer}\t${INPUT_SPLIT}`;
  currentReducer = (currentReducer + 1) % NUM_REDUCERS;
  return key;
};

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

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
    const mapOutput = `${deriveKey()}\t${proofString}\n`;
    process.stdout.write(mapOutput);
  }
};
