import { createInterface } from 'readline';
import { Field, Experimental, SelfProof, Struct, Poseidon } from 'snarkyjs';

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
  proof: undefined,
  sum: 0,
  number: 0,
  hash: '',
};

const processData = async (line: string): Promise<void> => {
  await RecursiveProgram.compile();

  const [, val] = line.split('\t');
  const [_num, _sum] = val.split(' ');
  const num = parseInt(_num);
  const sum = parseInt(_sum);

  const newSum = num + sum;
  const publicInput = new PublicInput({
    sum: Field(newSum),
    number: Field(num),
    hash: Poseidon.hash([Field(newSum)]),
  });

  if (!summary.proof) {
    summary.proof = await RecursiveProgram.init(publicInput);
  } else {
    summary.proof = await RecursiveProgram.step(publicInput, summary.proof);
  }
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
  const { number, sum, hash, proof } = summary;
  process.stdout.write(`${number} ${sum} ${hash} ${proof}`);
});
