import { Interface, createInterface } from 'readline';

export type ProcessLine<T> = (line: string, accumulator: T) => Promise<T>;
export type OnClosed<T> = (accumulator: T) => Promise<void>;

export class Processor<T> {
  rl: Interface;
  queue: string[];
  closed: boolean;
  accumulator: T;
  onNewLine: ProcessLine<T>;
  onClosed: OnClosed<T>;

  constructor(onNewLineFn: ProcessLine<T>, onClosedFn: OnClosed<T>) {
    this.rl = createInterface({
      input: process.stdin,
    });
    this.queue = [];
    this.closed = false;
    this.onNewLine = onNewLineFn;
    this.onClosed = onClosedFn;

    // on every new input add to the queue for asynchronous processing
    this.rl.on('line', (line) => {
      this.queue.push(line);
    });

    // take note when there's no more input
    this.rl.on('close', () => {
      this.closed = true;
    });
  }

  public async run(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = this.queue.shift();
      if (line) {
        this.accumulator = await this.onNewLine(line, this.accumulator);
      } else if (this.closed) {
        return this.onClosed(this.accumulator);
      }
    }
  }
}
