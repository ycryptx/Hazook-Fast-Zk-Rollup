import { createInterface } from 'readline';

let key = 0;

const rl = createInterface({
  input: process.stdin,
});

const parse = (line: string): string => {
  return `${parseInt(line) + 1}`;
};

// fire an event on each line read from RL
rl.on('line', (line) => {
  const val = parse(line);
  process.stdout.write(`${key}\t${val}\n`);
  key += 1;
});
