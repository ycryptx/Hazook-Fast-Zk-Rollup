import { createInterface } from 'readline';
import { TransactionBase, RollupProofBase, RollupBase } from '@ycryptx/rollup';
import { logger, compilationCache } from '../utils';

export const mapper = async (
  rollup: RollupBase,
  tx: TransactionBase,
  proof: RollupProofBase,
): Promise<void> => {
  let compiled = false;

  const deriveKey = (
    lineNumber: number,
    sequentialism: number,
    intermediateStage: number,
  ): string => {
    const partition =
      lineNumber - (lineNumber % (sequentialism * (intermediateStage + 1)));
    const key = `${partition}\t${lineNumber}`;
    return key;
  };

  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    if (!line) {
      continue;
    }

    // the first \t separated field is a key set by nLineInputFormat
    const [, lineNumber, sequentialism, intermediateStage, data] =
      line.split('\t');

    if (!data) {
      continue;
    }

    logger('mapper', `got line ${lineNumber}`);

    const mapKey = deriveKey(
      parseInt(lineNumber),
      parseInt(sequentialism),
      parseInt(intermediateStage),
    );

    if (parseInt(intermediateStage) > 0) {
      process.stdout.write(
        `${mapKey}\t${sequentialism}\t${intermediateStage}\t${data}\n`,
      );
      continue;
    }

    if (!compiled) {
      logger('mapper', `compiling zkapp`);
      const start = Date.now();
      try {
        await rollup.compile({ cache: compilationCache });
      } catch (err) {
        logger('mapper', `failed to compile zkapp ${err}`);
        throw err;
      }
      logger('mapper', `finished compiling, took ${Date.now() - start}ms`);
      compiled = true;
    }

    tx.deserialize(data);

    logger('mapper', `proving ${lineNumber}`);
    try {
      proof = await tx.baseFn();
    } catch (err) {
      logger('mapper', `failed to prove ${lineNumber} ${err}`);
      throw err;
    }
    logger('mapper', `proof ${lineNumber} finished`);
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(
      `${mapKey}\t${sequentialism}\t${intermediateStage}\t${proofString}\n`,
    );
    logger('mapper', `done`);
  }
};
