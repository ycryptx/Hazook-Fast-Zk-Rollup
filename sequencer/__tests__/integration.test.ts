import 'dotenv/config';
import { resolve } from 'path';
import { MapReduceClient } from '../src/map-reduce';
import { Mode } from '../src/map-reduce';

describe('integration tests', () => {
  let mapReduce: MapReduceClient;

  beforeAll(() => {
    process.env.MAPPER_FILE_PATH = '../../' + process.env.MAPPER_FILE_PATH;
    process.env.REDUCER_FILE_PATH = '../../' + process.env.REDUCER_FILE_PATH;
    mapReduce = new MapReduceClient(Mode.LOCAL, 'ap-northeast-1');
  });
  it('1. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../', 'data/run1.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${2 * 8 + 8}`);
  });
});
