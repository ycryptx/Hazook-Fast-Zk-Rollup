import { resolve } from 'path';

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

    switch (request.case) {
      case Case.CASE_RUN_UNSPECIFIED:
      case Case.CASE_RUN_1:
        inputFile = 'data/demo-0/run1.txt';
        break;
      case Case.CASE_RUN_2:
        inputFile = 'data/demo-0/run2.txt';
        break;
      case Case.CASE_RUN_3:
        inputFile = 'data/demo-0/run3.txt';
        break;
      case Case.CASE_RUN_4:
        inputFile = 'data/demo-0/run4.txt';
        break;
      default:
    }

    const absPathInputFile = resolve(__dirname, '../../', inputFile);
    // uplaod data to Hadoop
    const inputLocation = await mapReduce.upload(absPathInputFile);

    // start Hadoop map-reduce operation
    response.result = await mapReduce.process(inputLocation);

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
