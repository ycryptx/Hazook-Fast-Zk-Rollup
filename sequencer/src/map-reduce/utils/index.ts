import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TransactionPreProcessor } from '@ycryptx/rollup';
import { REDUCER_SEQUENTIALISM } from '../constants';
import { logger } from '../../utils';

export const runShellCommand = (cmd: string, log?: boolean): string => {
  try {
    const result = execSync(cmd);
    return (result || '').toString();
  } catch (err) {
    if (log) {
      logger.error(err);
    }
    return undefined;
  }
};

export const preprocessLocalTransactions = (txCount: number): string => {
  const preprocessedFile = 'preprocessed/input';
  try {
    fs.unlinkSync(path.join(__dirname, '../', preprocessedFile));
  } catch (err) {
    // ignore
  }

  const txPreProcessor = new TransactionPreProcessor();
  for (let i = 0; i < txCount; i++) {
    const tx = txPreProcessor.processTx(i);
    fs.appendFileSync(
      path.join(__dirname, '../', preprocessedFile),
      `${i}\t${REDUCER_SEQUENTIALISM}\t${'0'}\t${tx.serialize()}\n`,
    );
  }

  return preprocessedFile;
};
