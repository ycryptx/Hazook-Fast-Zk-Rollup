import { createInterface } from 'readline';
import { TransactionBase, RollupProofBase, RollupBase } from '@ycryptx/rollup';
import { logger } from '../utils';

export const mapper = async <
  Transaction extends TransactionBase,
  RollupProof extends RollupProofBase,
>(
  rollup: RollupBase,
): Promise<void> => {
  let compiled = false;

  const deriveKey = (lineNumber: number, sequentialism: number): string => {
    const reducerId = lineNumber - (lineNumber % sequentialism);
    const key = `${reducerId}\t${lineNumber}`;
    return key;
  };

  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    if (!line) {
      continue;
    }

    const [, lineNumber, sequentialism, isIntermediate, data] = // the first \t separated field is a key set by nLineInputFormat
      line.split('\t');

    logger('mapper', `got line ${lineNumber}`);

    const mapKey = deriveKey(parseInt(lineNumber), parseInt(sequentialism));

    if (isIntermediate == '1') {
      process.stdout.write(`${mapKey}\t${data}\n`);
      continue;
    }

    if (!compiled) {
      logger('mapper', `compiling zkapp`);
      try {
        await rollup.compile();
      } catch (err) {
        logger('mapper', `failed to compile zkapp ${err}`);
        throw err;
      }
      logger('mapper', `finished compiling`);
      compiled = true;
    }

    let tx: Transaction;
    tx.deserialize(data);

    let proof: RollupProof;
    logger('mapper', `proving ${lineNumber}`);
    try {
      proof = await tx.baseFn();
    } catch (err) {
      logger('mapper', `failed to prove ${lineNumber} ${err}`);
      throw err;
    }
    logger('mapper', `proof ${lineNumber} finished`);
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(`${mapKey}\t${proofString}\n`);
    logger('mapper', `done`);
  }
};
