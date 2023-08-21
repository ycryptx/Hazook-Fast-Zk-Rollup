import { Field, MerkleMapWitness } from 'snarkyjs';
import { createInterface } from 'readline';
import {
  Rollup,
  RollupState,
  JSONSerializedTransaction,
  SerializedTransaction,
} from '@ycryptx/rollup';

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

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

    const mapKey = deriveKey(parseInt(lineNumber), parseInt(parallelism));

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

    const proof = await Rollup.oneStep(
      state,
      serialized.initialRoot,
      serialized.latestRoot,
      serialized.key,
      serialized.currentValue,
      serialized.newValue,
      serialized.merkleMapWitness,
    );
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(`${mapKey}\t${proofString}\n`);
    console.error(
      `Mapper: input=${serialized.newValue.toString()} key=${mapKey}`,
    );
  }
};
