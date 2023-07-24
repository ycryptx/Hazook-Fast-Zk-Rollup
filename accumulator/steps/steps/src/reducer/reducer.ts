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
}) {}

export const RecursiveProgram = Experimental.ZkProgram({
  publicInput: PublicInput,
  publicOutput: Field, // hash

  methods: {
    init: {
      privateInputs: [],

      method(publicInput: PublicInput) {
        const { sum, number } = publicInput;

        sum.assertEquals(Field.from(0));

        return Poseidon.hash([sum.add(number)]);
      },
    },

    step: {
      privateInputs: [SelfProof],

      method(
        publicInput: PublicInput,
        earlierProof: SelfProof<PublicInput, Field>,
      ) {
        earlierProof.verify();

        const { number, sum } = publicInput;
        const { sum: earlierSum } = earlierProof.publicInput;

        sum.assertEquals(earlierSum.add(number));

        const newSum = earlierSum.add(number);

        const hash = Poseidon.hash([newSum]);

        return hash;
      },
    },
  },
});

export class RecursiveProof extends Experimental.ZkProgram.Proof(
  RecursiveProgram,
) {}

export const reducer = async (): Promise<void> => {
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
    const [, val] = line.split('\t');
    const [_num, _sum, proof] = val.split(' ');

    const num = parseInt(_num);
    const sum = parseInt(_sum);

    const newSum = num + sum + summary.sum;
    const publicInput = new PublicInput({
      sum: Field(newSum),
      number: Field(num),
    });

    let _proof: Proof<PublicInput, Field>;
    if (!proof && !summary.proof) {
      // this is the first line of the reduce step
      _proof = await RecursiveProgram.init(publicInput);
    } else if (proof && !summary.proof) {
      // this is the first line of a combine step
      _proof = await RecursiveProgram.step(
        publicInput,
        RecursiveProof.fromJSON(JSON.parse(proof)),
      );
    } else {
      // this is within the reduce
      _proof = await RecursiveProgram.step(
        publicInput,
        RecursiveProof.fromJSON(JSON.parse(summary.proof)),
      );
    }

    summary.proof = JSON.stringify(_proof.toJSON());
    summary.sum = newSum;
    summary.number = num;
    summary.hash = _proof.publicOutput.toString();
  };

  const queue = [] as string[];

  let closed = false;

  const runProving = async (): Promise<void> => {
    await RecursiveProgram.compile();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = queue.shift();
      if (line) {
        await processData(line);
      } else if (closed) {
        const { number, sum, proof } = summary;
        process.stdout.write(`${number} ${sum} ${proof}`);
        return;
      }
    }
  };

  // fire an event on each line read from RL
  rl.on('line', async (line) => {
    queue.push(line);
  });

  // final event when the file is closed, to flush the final accumulated value
  rl.on('close', () => {
    closed = true;
  });

  await runProving();
};
