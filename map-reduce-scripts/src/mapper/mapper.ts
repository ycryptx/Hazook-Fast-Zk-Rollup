import { Field, MerkleMapWitness } from 'snarkyjs';
import { createInterface } from 'readline';
import {
  Rollup,
  RollupState,
  JSONSerializedTransaction,
  SerializedTransaction,
  RollupProof,
} from '@ycryptx/rollup';
import { logger } from '../utils';

export const mapper = async (): Promise<void> => {
  let compiled = false;

  const deriveKey = (lineNumber: number, parallelism: number): string => {
    const reducerId = lineNumber - (lineNumber % parallelism);
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

    const [lineNumber, parallelism, data] = line.split('\t');

    logger('mapper', `got line ${lineNumber}`);

    const mapKey = deriveKey(parseInt(lineNumber), parseInt(parallelism));

    if (!compiled) {
      logger('mapper', `compiling zkapp`);
      try {
        await Rollup.compile();
      } catch (err) {
        logger('mapper', `failed to compile zkapp ${err}`);
        throw err;
      }
      logger('mapper', `finished compiling`);
      compiled = true;
    }

    const jsonSerialized: JSONSerializedTransaction = JSON.parse(data);

    const serialized = new SerializedTransaction({
      initialRoot: Field(jsonSerialized.initialRoot),
      latestRoot: Field(jsonSerialized.latestRoot),
      key: Field(jsonSerialized.key),
      currentValue: Field(jsonSerialized.currentValue),
      newValue: Field(jsonSerialized.newValue),
      merkleMapWitness: MerkleMapWitness.fromJSON(
        jsonSerialized.merkleMapWitness,
      ),
    });

    const state = new RollupState({
      initialRoot: serialized.initialRoot,
      latestRoot: serialized.latestRoot,
    });
    let proof: RollupProof;
    logger('mapper', `proving ${lineNumber}`);
    try {
      proof = await Rollup.oneStep(
        state,
        serialized.initialRoot,
        serialized.latestRoot,
        serialized.key,
        serialized.currentValue,
        serialized.newValue,
        serialized.merkleMapWitness,
      );
    } catch (err) {
      logger('mapper', `failed to prove ${lineNumber} ${err}`);
      throw err;
    }
    logger('mapper', `proof ${lineNumber} finished`);
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(`${mapKey}\t${proofString}\n`);
  }
};
