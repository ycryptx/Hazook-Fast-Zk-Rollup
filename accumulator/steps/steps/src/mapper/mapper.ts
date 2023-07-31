import { Field, MerkleMapWitness } from 'snarkyjs';
import { createInterface } from 'readline';
import { Rollup, RollupState } from '../rollup';

const INPUT_SPLIT = process.env.mapreduce_map_input_start;
const NUM_REDUCERS = 4;

export type Serialized = {
  initialRoot: string;
  latestRoot: string;
  key: string;
  currentValue: string;
  newValue: string;
  merkleMapWitness: string;
};

type Deserialized = {
  initialRoot: Field;
  latestRoot: Field;
  key: Field;
  currentValue: Field;
  newValue: Field;
  merkleMapWitness: MerkleMapWitness;
};

export const mapper = async (): Promise<void> => {
  await Rollup.compile();

  let currentReducer = 0;
  let inputSplitCounter = 0;

  const deriveKey = (): string => {
    const key = `${currentReducer}\t${INPUT_SPLIT + inputSplitCounter}`;
    currentReducer = (currentReducer + 1) % NUM_REDUCERS;
    inputSplitCounter += 1;
    return key;
  };

  const rl = createInterface({
    input: process.stdin,
  });

  for await (const line of rl) {
    if (!line) {
      continue;
    }

    const serialized: Serialized = JSON.parse(line);

    const deserialized: Deserialized = {
      initialRoot: Field(serialized.initialRoot),
      latestRoot: Field(serialized.latestRoot),
      key: Field(serialized.key),
      currentValue: Field(serialized.currentValue),
      newValue: Field(serialized.newValue),
      merkleMapWitness: MerkleMapWitness.fromJSON(serialized.merkleMapWitness),
    };

    const state = new RollupState({
      initialRoot: deserialized.initialRoot,
      latestRoot: deserialized.latestRoot,
    });

    const proof = await Rollup.oneStep(
      state,
      deserialized.initialRoot,
      deserialized.latestRoot,
      deserialized.key,
      deserialized.currentValue,
      deserialized.newValue,
      deserialized.merkleMapWitness,
    );
    const proofString = JSON.stringify(proof.toJSON());
    process.stdout.write(`${deriveKey()}\t${proofString}\n`);
  }
};
