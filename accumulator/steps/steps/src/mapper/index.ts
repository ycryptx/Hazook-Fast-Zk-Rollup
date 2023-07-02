import { createInterface } from 'readline';
import { Poseidon, Field } from 'snarkyjs';

let key = 0;

const rl = createInterface({
  input: process.stdin,
});

const parse = (line: string): string => {
  // "number sum hash proof"
  return `${line} ${0} ${Poseidon.hash([Field(parseInt(line))]).toString()}`;
};

// fire an event on each line read from RL
rl.on('line', (line) => {
  const val = parse(line);
  process.stdout.write(`${key}\t${val}\n`);
  key += 1;
});
