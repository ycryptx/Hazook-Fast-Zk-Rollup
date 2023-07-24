import { createInterface } from 'readline';

export const mapper = (): void => {
  let key = 0;

  const rl = createInterface({
    input: process.stdin,
  });

  const parse = (line: string): string => {
    // "number sum proof"
    const sum = 0;
    const proof = '';
    return `${line} ${sum} ${proof}`;
  };

  // fire an event on each line read from RL
  rl.on('line', (line) => {
    const val = parse(line);
    process.stdout.write(`${key}\t${val}\n`);
    key += 1;
  });
};
