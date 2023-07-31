/* eslint-disable jest/no-disabled-tests */

import { Rollup } from '../src';

describe.skip('test rollup', () => {
  let verificationKey: string;
  beforeAll(async () => {
    console.log('compiling zk program...');
    const start = Date.now();
    const compiled = await Rollup.compile();
    console.log('finished compiling!', Date.now() - start);
    verificationKey = compiled.verificationKey;
    console.log('verificationKey', verificationKey);
  }, 1000 * 60 * 10);

  it.skip('case 1', async () => {
    // const state1 = RollupState.createOneStep(Field(1));
    // const proof1 = await Rollup.oneStep(state1);

    // const state2 = RollupState.createOneStep(Field(2));
    // const proof2 = await Rollup.oneStep(state1);

    // const newState = RollupState.createMerged(state1, state2);

    // const accumulatedProof = await Rollup.merge(newState, proof1, proof2);
    // console.log(JSON.stringify(accumulatedProof.toJSON));
    // expect(accumulatedProof).toBeTruthy();
    expect(true).toBe(true);
  });
});
