/* eslint-disable jest/no-disabled-tests */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Poseidon, Field, verify } from 'snarkyjs';
import { stdin as mockProcessStdin, MockSTDIN } from 'mock-stdin';

import { mapper } from '../src/mapper/mapper';
import {
  reducer,
  RecursiveProgram,
  RecursiveProof,
} from '../src/reducer/reducer';

describe.skip('test map reduce', () => {
  let verificationKey: string;
  let mockStdin: MockSTDIN;
  beforeAll(async () => {
    mockStdin = mockProcessStdin();
    const compiled = await RecursiveProgram.compile();
    verificationKey = compiled.verificationKey;
    console.log('verificationKey', verificationKey);
  }, 1000 * 60 * 10);

  it('case 1', async () => {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(__dirname, 'misc/run.txt')),
      crlfDelay: Infinity,
    });

    const stdout = readline.createInterface({
      input: process.stdout,
      crlfDelay: Infinity,
    });

    let result: string;

    mapper();
    for await (const line of rl) {
      mockStdin.send(line);
    }
    stdout.on('line', (line) => (result = line));
    await reducer();

    const finalProof = RecursiveProof.fromJSON(JSON.parse(result));

    expect(finalProof.publicOutput).toBe(Poseidon.hash([Field(6)]));
    expect(await verify(finalProof, verificationKey)).toBe(true);
  });
});
