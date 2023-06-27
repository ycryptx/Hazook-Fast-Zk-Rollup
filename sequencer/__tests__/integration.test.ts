import { resolve } from 'path';
import { generateStateProof } from '../src/generateStateProof';

describe('integration tests', () => {
  it('1. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run1.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `${2 * 8}`,
    );
  });
  it('2. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run2.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `${3 * 64}`,
    );
  });

  it('3. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run3.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `${4 * 256}`,
    );
  });

  it('4. demo-0: should sum numbers correctly', async () => {
    const dataFilePath = resolve(__dirname, '../..', 'data/demo-0/run4.txt');
    expect((await generateStateProof(dataFilePath)).toString().trim()).toEqual(
      `${5 * 2048}`,
    );
  });
});
