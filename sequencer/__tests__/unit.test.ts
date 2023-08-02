import { splitReorder } from '../src/map-reduce/utils';

describe('utils tests', () => {
  it('test splitReorder', async () => {
    const txs = [0, 1, 2, 3, 4, 5, 6, 7];
    const reordered = splitReorder<number>(txs, 3);
    expect(reordered).toEqual([0, 3, 6, 1, 4, 7, 2, 5]);
  });
});
