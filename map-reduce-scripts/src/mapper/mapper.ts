import {
  Bool,
  Field,
  MerkleMapWitness,
  PrivateKey,
  Provable,
  Poseidon,
} from 'snarkyjs';
import { createInterface } from 'readline';
import {
  Rollup,
  RollupState,
  JSONSerializedTransaction,
  SerializedTransaction,
  RollupProof,
  MerkleWitness1000,
} from '@ycryptx/rollup';
import { logger } from '../utils';

export const mapper = async (): Promise<void> => {
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
      voteYes: Bool(jsonSerialized.voteYes),
      privateKey: PrivateKey.fromJSON(jsonSerialized.privateKey),
      randomness: Field(jsonSerialized.randomness),
      initialNullifierRoot: Field(jsonSerialized.initialNullifierRoot),
      latestNullifierRoot: Field(jsonSerialized.latestNullifierRoot),
      voterWitness: MerkleWitness1000.fromJSON(jsonSerialized.voterWitness),
      nullifierWitness: MerkleMapWitness.fromJSON(
        jsonSerialized.nullifierWitness,
      ),
    });

    const votersRoot = serialized.voterWitness.calculateRoot(
      Poseidon.hash(serialized.privateKey.toPublicKey().toFields()),
    );

    const state = new RollupState({
      voteYes: Provable.if(serialized.voteYes, Field, Field(1), Field(0)),
      voteNo: Provable.if(serialized.voteYes.not(), Field, Field(1), Field(0)),
      votersRoot,
      initialNullifierRoot: serialized.initialNullifierRoot,
      latestNullifierRoot: serialized.latestNullifierRoot,
    });
    let proof: RollupProof;
    logger('mapper', `proving ${lineNumber}`);
    try {
      proof = await Rollup.oneStep(
        state,
        serialized.privateKey,
        serialized.voteYes,
        serialized.randomness,
        serialized.voterWitness,
        serialized.nullifierWitness,
      );
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
