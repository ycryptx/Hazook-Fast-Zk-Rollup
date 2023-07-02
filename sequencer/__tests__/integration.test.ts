import 'dotenv/config';
import { resolve } from 'path';
import { MapReduceClient } from '../src/map-reduce';
import { Mode } from '../src/map-reduce';

describe('integration tests', () => {
  let mapReduce: MapReduceClient;

  beforeAll(() => {
    mapReduce = new MapReduceClient(Mode.LOCAL, 'ap-northeast-1');
  });
  it('1. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run1.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${2 * 8}`);
  });
  it('2. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run2.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${3 * 64}`);
  });

  it('3. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run3.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${4 * 256}`);
  });

  it('4. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run4.txt');
    const inputLocation = await mapReduce.upload(dataFilePath);
    expect(await mapReduce.process(inputLocation)).toEqual(`${5 * 2048}`);
  });
});
