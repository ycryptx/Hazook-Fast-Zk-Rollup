/* eslint-disable jest/no-disabled-tests */
import * as path from 'path';
import { Cache } from 'o1js';

import {
  Rollup,
  MyRollupProof,
  RollupProofBase,
  TransactionPreProcessor,
  MyTransaction,
} from '../src';

const compilationCache: Cache = Cache.FileSystem(path.join(__dirname, 'cache'));

const txs = [0, 1, 2, 3, 4, 5, 6, 7];

// TODO: consider using this in reducer script
class Accumulator<RollupProof extends RollupProofBase> {
  private _accumulatedProof: RollupProof;

  public async addProof(proof: RollupProof): Promise<void> {
    if (!this._accumulatedProof) {
      this._accumulatedProof = proof;
      return;
    }
    this._accumulatedProof = (await this._accumulatedProof.merge(
      proof,
    )) as RollupProof;
  }

  public get accumulatedProof(): RollupProof {
    return this._accumulatedProof;
  }
}

describe('rollup', () => {
  let verificationKey: string;
  beforeAll(async () => {
    console.log('compiling zk program...');
    const start = Date.now();
    const compiled = await Rollup.compile({ cache: compilationCache });
    console.log('finished compiling!', Date.now() - start);
    verificationKey = compiled.verificationKey;
    console.log('verificationKey', verificationKey);
  }, 1000 * 60 * 10);

  it(
    'test proof accumulation',
    async () => {
      const oneStepRunningTimes: number[] = [];
      const mergeRunningTimes: number[] = [];

      const txPreProcessor = new TransactionPreProcessor();
      const intermediateProofs: MyRollupProof[] = [];
      const accumulator = new Accumulator<MyRollupProof>();

      const intermediateTxs: MyTransaction[] = [];
      for (const tx of txs) {
        const iTx = txPreProcessor.processTx(tx);
        intermediateTxs.push(iTx);
      }
      for (const iTx of intermediateTxs) {
        const start = Date.now();
        const iProof = await iTx.baseFn();
        oneStepRunningTimes.push(Date.now() - start);
        intermediateProofs.push(iProof);
      }

      for (const iProof of intermediateProofs) {
        const start = Date.now();
        await accumulator.addProof(iProof);
        mergeRunningTimes.push(Date.now() - start);
      }

      console.log(JSON.stringify(accumulator.accumulatedProof.toJSON()));

      console.log(
        'oneStep avg proving times',
        oneStepRunningTimes.reduce((a, b) => a + b, 0) /
          oneStepRunningTimes.length,
      );
      console.log(
        'merge avg proving times',
        mergeRunningTimes.reduce((a, b) => a + b, 0) / mergeRunningTimes.length,
      );

      expect(await Rollup.verify(accumulator.accumulatedProof)).toBeTruthy();
      expect(
        accumulator.accumulatedProof.publicInput.latestRoot.toString(),
      ).toEqual(
        intermediateProofs[
          intermediateProofs.length - 1
        ].publicInput.latestRoot.toString(),
      );
      expect(
        accumulator.accumulatedProof.publicInput.initialRoot.toString(),
      ).toEqual(intermediateProofs[0].publicInput.initialRoot.toString());
    },
    1000 * 60 * 100,
  );
});
