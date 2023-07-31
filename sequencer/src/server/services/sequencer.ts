import * as path from 'path';
import * as fs from 'fs';
import { Field, MerkleMap } from 'snarkyjs';
import { createInterface } from 'readline';
import { Serialized } from 'rollup/src/mapper/mapper';

import {
  Case,
  DemoRequest,
  DemoResponse,
  SequencerServiceImplementation,
  SequencerServiceDefinition,
  DeepPartial,
} from '../compiled/services/sequencer/v1/sequencer_service';
import { Mode, MapReduceClient } from '../../map-reduce';

const mode = process.env.MODE == 'local' ? Mode.LOCAL : Mode.EMR;
const region = process.env.REGION;
const mapReduce = new MapReduceClient(mode, region);

const preProcessInputFile = async (inputFile: string): Promise<string> => {
  const preprocessedFile = inputFile.replace('data', 'preprocessed');
  const rl = createInterface({
    input: fs.createReadStream(path.join(__dirname, '../', inputFile)),
  });

  const merkleMap = new MerkleMap();

  let currentValue = Field(0);

  for await (const line of rl) {
    if (!line) {
      continue;
    }
    const initialRoot = merkleMap.getRoot();
    const number = parseInt(line);
    const value = Field(number);
    const key = Field(merkleMap.tree.leafCount);

    merkleMap.set(key, value);

    const witness = merkleMap.getWitness(key);

    witness.toJSON();

    const lineToWrite: Serialized = {
      initialRoot: initialRoot.toJSON(),
      latestRoot: merkleMap.getRoot().toJSON(),
      key: key.toJSON(),
      currentValue: currentValue.toJSON(),
      newValue: value.toJSON(),
      merkleMapWitness: witness.toJSON(),
    };

    fs.appendFileSync(
      path.join(__dirname, '../', preprocessedFile),
      `${JSON.stringify(lineToWrite)}\n`,
    );

    currentValue = value;
  }

  return preprocessedFile;
};

/**
 * sequencer
 *
 */
class Sequencer implements SequencerServiceImplementation {
  /**
   * Implements the SayHello RPC method.
   */
  demo = async (request: DemoRequest): Promise<DeepPartial<DemoResponse>> => {
    const response: DemoResponse = { result: '' };
    let inputFile = '';

    const start = Date.now();

    let inputLength = 0;

    switch (request.case) {
      case Case.CASE_RUN_UNSPECIFIED:
      case Case.CASE_RUN_1:
        inputFile = 'data/run1.txt';
        inputLength = 8;
        break;
      case Case.CASE_RUN_2:
        inputFile = 'data/run2.txt';
        inputLength = 64;
        break;
      case Case.CASE_RUN_3:
        inputFile = 'data/run3.txt';
        inputLength = 256;
        break;
      case Case.CASE_RUN_4:
        inputFile = 'data/run4.txt';
        inputLength = 16384;
        break;
      default:
    }

    const preProcessedInputFile = await preProcessInputFile(inputFile);

    const absPathInputFile = path.join(__dirname, '../', preProcessedInputFile);
    // uplaod data to Hadoop
    const inputLocation = await mapReduce.upload(absPathInputFile);

    // start Hadoop map-reduce operation
    response.result = await mapReduce.process(inputLocation, inputLength);

    const end = Date.now();

    console.log(`Demo ${request.case} finished`);
    console.log(`Result: ${response.result}`);
    console.log(`Running time: ${end - start} ms`);

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
