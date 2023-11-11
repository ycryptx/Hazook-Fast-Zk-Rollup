import { Cache } from 'o1js';

export const COMPILATION_CACHE_PATH = `/compilation`;

export const logger = (instance: string, msg: string): void => {
  console.error(`${new Date().toISOString()} ${instance}: ${msg}`);
};

export const compilationCache: Cache = Cache.FileSystem(COMPILATION_CACHE_PATH);
