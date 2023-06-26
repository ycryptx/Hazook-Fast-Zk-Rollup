import { resolve } from 'path';
import { generateStateProof } from '../src/generateStateProof';
describe('integration tests', () => {
  it('1. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run1.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `200`,
    );
  });
  it('2. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run2.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `1115`,
    );
  });
});
