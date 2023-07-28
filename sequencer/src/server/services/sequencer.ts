import * as path from 'path';

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

    const absPathInputFile = path.join(__dirname, '../', inputFile);
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
