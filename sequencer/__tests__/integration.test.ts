import 'dotenv/config';
import * as path from 'path';
import { MapReduceClient } from '../src/map-reduce';
import { Mode } from '../src/map-reduce';

describe('integration tests', () => {
  let mapReduce: MapReduceClient;

  beforeAll(() => {
    process.env.MAPPER_FILE_PATH = '../../sequencer/__tests__/misc/mapper.js';
    process.env.REDUCER_FILE_PATH = '../../sequencer/__tests__/misc/reducer.js';
    mapReduce = new MapReduceClient(Mode.LOCAL, 'ap-northeast-1');
  });
  it('1. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = path.join(__dirname, 'misc/run.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${2 * 8 + 8}`);
  });
});
