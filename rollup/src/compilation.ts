import * as path from 'path';
import { Cache } from 'o1js';

import { RollupBase } from './generics';

const compilationCache: Cache = Cache.FileSystem(
  path.join(__dirname, '..', 'compilation'),
);

/**
 * 
 * @param rollup 
 * @returns 
 */
export const compile = async <Rollup extends RollupBase>(
  rollup: Rollup,
): Promise<void> => {
  console.log('compiling zkapp...');
  const start = Date.now();
  await rollup.compile({ cache: compilationCache });
  console.log('Finished compiling zkapp!', Date.now() - start);
  return;
};
