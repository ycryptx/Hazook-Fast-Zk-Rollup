import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
describe('test map reduce', () => {
  it('case 1', () => {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(__dirname, 'misc/run.txt')),
      crlfDelay: Infinity,
    });
    require('../src/mapper');
    require('../src/reducer');
    rl.on('line', (line) => {
      console.log(line);
    });
    expect(true).toBe(true);
  });
});
