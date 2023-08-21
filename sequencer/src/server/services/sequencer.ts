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

    switch (request.case) {
      case Case.CASE_RUN_UNSPECIFIED:
      case Case.CASE_RUN_1:
        inputFile = 'data/run1.txt';
        break;
      case Case.CASE_RUN_2:
        inputFile = 'data/run2.txt';
        break;
      case Case.CASE_RUN_3:
        inputFile = 'data/run3.txt';
        break;
      case Case.CASE_RUN_4:
        inputFile = 'data/run4.txt';
        break;
      default:
    }

    const preProcessedInputFile = await preProcessInputFile(inputFile);

    const absPathInputFile = path.join(__dirname, '../', preProcessedInputFile);
    // uplaod data to Hadoop
    const inputLocation = await mapReduce.upload(absPathInputFile);

    // start Hadoop map-reduce operation
    response.result = await mapReduce.process(inputLocation);

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
