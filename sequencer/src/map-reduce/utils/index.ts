import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as randString from 'randomstring';
import { createInterface } from 'readline';
import { MerkleTree, PrivateKey, Poseidon } from 'snarkyjs';
import { TransactionPreProcessor } from '@ycryptx/rollup';

export const runShellCommand = (cmd: string, log?: boolean): string => {
  try {
    const result = execSync(cmd);
    return (result || '').toString();
  } catch (err) {
    if (log) {
      console.error(err);
    }
    return undefined;
  }
};

export const preProcessRawTransactions = async (
  inputFile: string,
): Promise<{ preprocessedFile: string; lineNumber: number }> => {
  const sequentialism = 4; // each parallel process should not compute more than 4 proofs if there are enough cores
  const preprocessedFile = inputFile.replace('data', 'preprocessed');
  const rl = createInterface({
    input: fs.createReadStream(path.join(__dirname, '../', inputFile)),
  });
  const txPreProcessor = new TransactionPreProcessor();

  const votersTree = new MerkleTree(20);

  const voters: PrivateKey[] = [];

  try {
    fs.unlinkSync(path.join(__dirname, '../', preprocessedFile));
  } catch (err) {
    // ignore
  }

  let lineNumber = 0;
  for await (const line of rl) {
    if (!line) {
      continue;
    }
    voters.push(PrivateKey.random());
    votersTree.setLeaf(
      BigInt(lineNumber),
      Poseidon.hash(voters[lineNumber].toPublicKey().toFields()),
    );

    const tx = txPreProcessor.processTx({
      voteYes: line == '1',
      privateKey: voters[lineNumber].toJSON(),
      randomness: `${randString.generate(5)}`,
      voters: votersTree,
      voterIndex: lineNumber,
    });
    fs.appendFileSync(
      path.join(__dirname, '../', preprocessedFile),
      `${lineNumber}\t${sequentialism}\t${'0'}\t${JSON.stringify(
        tx.toJSON(),
      )}\n`,
    );
    lineNumber += 1;
  }

  return { preprocessedFile, lineNumber };
};

const countLinesInFile = async (file: string): Promise<number> => {
  const rl = createInterface({
    input: fs.createReadStream(path.join(__dirname, '../', file)),
  });
  let lines = 0;
  for await (const _ of rl) {
    lines += 1;
  }
  return lines;
};

export function splitReorder<T>(txs: T[], splits: number): T[] {
  if (splits >= txs.length) {
    throw new Error('# of splits exceeds transaction count');
  }
  const reorderedTxs: T[] = new Array(txs.length);

  // we are reordering transactions this way so that proofs will be accumulated in the correct order.
  // refer to the mapper script for more details
  let c = 0,
    r = 0;
  for (let i = 0; i < txs.length; i++) {
    if (r + splits * c >= txs.length) {
      r += 1;
      c = 0;
    }
    const j = r + splits * c;
    reorderedTxs[j] = txs[i];
    c += 1;
  }
  return reorderedTxs;
}
