import { Field, MerkleMapWitness } from 'snarkyjs';
import { createInterface } from 'readline';
import {
  Rollup,
  RollupState,
  JSONSerializedTransaction,
  SerializedTransaction,
} from '@ycryptx/rollup';

const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUMBER_OF_REDUCERS = 4;

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

  let currentReducer = 0;
  // let inputSplitCounter = 0;

  const deriveKey = (): string => {
    const key = `${currentReducer}\t${INPUT_SPLIT}`;
    currentReducer = (currentReducer + 1) % NUMBER_OF_REDUCERS;
    return key;
  };

  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    const [, value] = line.split('\t'); // mapper input is in k:v form of offset \t line due to NLineInputFormat
    if (!value) {
      continue;
    }

    const jsonSerialized: JSONSerializedTransaction = JSON.parse(value);

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
    const mapKey = deriveKey();
    process.stdout.write(`${mapKey}\t${proofString}\n`);
    console.error(
      `Mapper: input=${serialized.newValue.toString()} split=${INPUT_SPLIT}, key=${mapKey}`,
    );
  }
};
