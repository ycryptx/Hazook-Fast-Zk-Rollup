/* eslint-disable jest/no-disabled-tests */
import * as fs from 'fs';
import * as path from 'path';
import { Processor } from '../src/processor';
import { stdin, MockSTDIN } from 'mock-stdin';

describe('test processor', () => {
  let mockProcess: MockSTDIN;
  beforeAll(async () => {
    mockProcess = stdin();
  });
  it('should read all input and process it', async () => {
    const onNewLine = async (line: string, acc: unknown): Promise<unknown> => {
      expect(line).toEqual('2');
      return acc;
    };
    const onEnd = async (acc: unknown): Promise<void> => {
      acc;
      return;
    };
    const onEndMock = jest.fn(onEnd);
    const onNewLineMock = jest.fn(onNewLine);
    const file = fs.readFileSync(path.join(__dirname, 'misc/run.txt'), 'utf-8');
    const processor = new Processor(onNewLineMock, onEndMock);
    mockProcess.send(file);
    mockProcess.end();
    await processor.run();
    expect(onEndMock).toHaveBeenCalled();
    expect(onNewLineMock).toHaveBeenCalledTimes(3);
  });
});

// describe.skip('test rollup', () => {
//   let verificationKey: string;
//   beforeAll(async () => {
//     console.log('compiling zk program...');
//     const start = Date.now();
//     const compiled = await Rollup.compile();
//     console.log('finished compiling!', Date.now() - start);
//     verificationKey = compiled.verificationKey;
//     console.log('verificationKey', verificationKey);
//   }, 1000 * 60 * 10);

//   it('case 1', async () => {
//     const state1 = RollupState.createOneStep(Field(1));
//     const proof1 = await Rollup.oneStep(state1);

//     const state2 = RollupState.createOneStep(Field(2));
//     const proof2 = await Rollup.oneStep(state1);

//     const newState = RollupState.createMerged(state1, state2);

//     const accumulatedProof = await Rollup.merge(newState, proof1, proof2);
//     console.log(JSON.stringify(accumulatedProof.toJSON));
//     expect(accumulatedProof).toBeTruthy();
//   });
// });
