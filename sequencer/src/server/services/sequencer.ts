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
import { preProcessInputFile } from '../../map-reduce/utils';

const MODE = process.env.MODE == 'local' ? Mode.LOCAL : Mode.EMR;
const REGION = process.env.REGION;
const NUMBER_OF_REDUCERS = parseInt(process.env.NUMBER_OF_REDUCERS) || 4;
const mapReduce = new MapReduceClient(MODE, REGION);

/**
 * sequencer
 *
 */
class Sequencer implements SequencerServiceImplementation {
  /**
   * Implements the demo RPC method.
   */
  demo = async (request: DemoRequest): Promise<DeepPartial<DemoResponse>> => {
    const response: DemoResponse = { result: '' };
    let inputFile = '';
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

    const preProcessedInputFile = await preProcessInputFile(
      inputFile,
      NUMBER_OF_REDUCERS,
    );

    const absPathInputFile = path.join(__dirname, '../', preProcessedInputFile);
    // uplaod data to Hadoop
    const inputLocation = await mapReduce.upload(absPathInputFile);

    // start Hadoop map-reduce operation
    response.result = await mapReduce.process(inputLocation, inputLength);

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
