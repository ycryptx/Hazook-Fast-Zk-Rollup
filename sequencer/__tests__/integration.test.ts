import 'dotenv/config';
import * as path from 'path';
import { MapReduceClient } from '../src/map-reduce';
import { Mode } from '../src/map-reduce';
import { MyRollupProof } from '@ycryptx/rollup';

/**
 * Have each state be the hash of a number, and each transaction be a number.
 * Make the snark prove the sum of all the numbers in the transactions.
 * Use that to accumulate 8, 64, 256, 2048, and 16384 transactions.
 */
describe('integration tests', () => {
  let mapReduce: MapReduceClient<MyRollupProof>;

  beforeAll(() => {
    process.env.MAPPER_FILE_PATH = '../../sequencer/__tests__/misc/mapper.js';
    process.env.REDUCER_FILE_PATH = '../../sequencer/__tests__/misc/reducer.js';
    mapReduce = new MapReduceClient(Mode.LOCAL, 'ap-northeast-1');
  });
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip(
    '1. demo-0: should sum numbers correctly',
    async () => {
      const dataFilePath = path.join(__dirname, 'misc/run.txt');
      const inputLocation = await mapReduce.uploader.uploadInputFromDisk(
        dataFilePath,
      );
      const mapReduceResult = await mapReduce.process(inputLocation, 8);

      expect(mapReduceResult).toEqual(`${1 + 2 + 3 + 4 + 5 + 6 + 7}`);
    },
    1000 * 60 * 5,
  );
});
