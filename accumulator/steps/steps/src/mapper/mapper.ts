import { Field } from 'snarkyjs';
import { Rollup, RollupState, Processor } from '../common';

const onNewLine = async (line: string, key: number): Promise<number> => {
  if (!key) {
    key = 0;
  }

  const number = parseInt(line);
  const state = RollupState.createOneStep(Field(number));
  const proof = await Rollup.oneStep(state);
  const proofString = JSON.stringify(proof.toJSON());
  const mapOutput = `${key}\t${proofString}\n`;
  console.log('MAPPER: ', mapOutput);
  process.stdout.write(mapOutput);
  return key + 1;
};

const onClosed = async (): Promise<void> => {
  return;
};

export const mapper = async (): Promise<void> => {
  await Rollup.compile();
  const processor = new Processor<number>(onNewLine, onClosed);
  await processor.run();
};
