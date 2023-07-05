import { createInterface } from 'readline';
import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Poseidon,
  Proof,
} from 'snarkyjs';

export class PublicInput extends Struct({
  sum: Field,
  number: Field,
  hash: Field,
}) {}

export const RecursiveProgram = Experimental.ZkProgram({
  publicInput: PublicInput,

  methods: {
    init: {
      privateInputs: [],

      method(publicInput: PublicInput) {
        const { sum, hash } = publicInput;
        hash.assertEquals(Poseidon.hash([sum]), 'incorrect sum hash');
      },
    },

    step: {
      privateInputs: [SelfProof],

      method(
        publicInput: PublicInput,
        earlierProof: SelfProof<PublicInput, void>,
      ) {
        // verify earlier proof
        earlierProof.verify();

        const { number, hash } = publicInput;

        const expectedHash = Poseidon.hash([
          earlierProof.publicInput.sum.add(number),
        ]);
        hash.assertEquals(expectedHash, 'incorrect sum hash');
      },
    },
  },
});

const rl = createInterface({
  input: process.stdin,
});

// variable used as an accumulator
const summary = {
  proof: '',
  sum: 0,
  number: 0,
  hash: '',
};

const processData = async (line: string): Promise<void> => {
  await RecursiveProgram.compile();

  const [, val] = line.split('\t');
  const [_num, _sum, proof] = val.split(' ');
  const num = parseInt(_num);
  const sum = parseInt(_sum);

  const newSum = num + sum;
  const publicInput = new PublicInput({
    sum: Field(newSum),
    number: Field(num),
    hash: Poseidon.hash([Field(newSum)]),
  });

  let _proof: Proof<PublicInput, void>;
  if (!proof && !summary.proof) {
    // this is the first line of the reduce step
    _proof = await RecursiveProgram.init(publicInput);
  } else if (proof && !summary.proof) {
    // this is the first line of a combine step
    _proof = await RecursiveProgram.step(
      publicInput,
      Proof.fromJSON(JSON.parse(proof)),
    );
  } else {
    // this is within the reduce
    _proof = await RecursiveProgram.step(
      publicInput,
      Proof.fromJSON(JSON.parse(summary.proof)),
    );
  }

  summary.proof = JSON.stringify(_proof.toJSON());
  summary.sum = newSum;
  summary.number = num;
  summary.hash = publicInput.hash.toString();
};

// fire an event on each line read from RL
rl.on('line', (line) => {
  processData(line);
});

// final event when the file is closed, to flush the final accumulated value
rl.on('close', () => {
  const { number, sum, proof } = summary;
  process.stdout.write(`${number} ${sum} ${proof}`);
});
