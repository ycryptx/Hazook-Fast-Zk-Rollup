import { RollupProofBase } from '@ycryptx/rollup';
import {
  Case,
  DemoRequest,
  DemoResponse,
  SequencerServiceImplementation,
  SequencerServiceDefinition,
  DeepPartial,
} from '../compiled/services/sequencer/v1/sequencer_service';
import { Mode, MapReduceClient } from '../../map-reduce';

const MODE = process.env.MODE == 'local' ? Mode.LOCAL : Mode.EMR;
const REGION = process.env.REGION;

/**
 * sequencer
 *
 */
class Sequencer<RollupProof extends RollupProofBase>
  implements SequencerServiceImplementation
{
  mapReduce: MapReduceClient<RollupProof>;

  constructor() {
    this.mapReduce = new MapReduceClient<RollupProof>(MODE, REGION);
  }

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

    // start Hadoop map-reduce operation
    const proof = await this.mapReduce.process(inputFile);

    response.result = JSON.stringify(proof.toJSON());

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
