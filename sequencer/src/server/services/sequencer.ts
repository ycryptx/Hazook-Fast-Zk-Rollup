import { RollupProofBase, TransactionPreProcessor } from '@ycryptx/rollup';
import {
  Case,
  DemoRequest,
  DemoResponse,
  SequencerServiceImplementation,
  SequencerServiceDefinition,
  DeepPartial,
} from '../compiled/services/sequencer/v1/sequencer_service';
import { Mode, MapReduceClient } from '../../map-reduce';
import { preprocessLocalTransactions } from '../../map-reduce/utils';

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
    let txCount = 0;

    switch (request.case) {
      case Case.CASE_RUN_UNSPECIFIED:
      case Case.CASE_RUN_1:
        txCount = 8;
        break;
      case Case.CASE_RUN_2:
        txCount = 64;
        break;
      case Case.CASE_RUN_3:
        txCount = 256;
        break;
      case Case.CASE_RUN_4:
        txCount = 1024;
        this.mapReduce.onDemandInstances = true;
        break;
      default:
    }

    let inputFileUrl: string;

    if (MODE === Mode.LOCAL) {
      inputFileUrl = preprocessLocalTransactions(txCount);
    } else {
      const txUploader = this.mapReduce.uploader.uploadTransactionsToS3();
      const txPreProcessor = new TransactionPreProcessor();
      for (let i = 0; i < txCount; i++) {
        const tx = txPreProcessor.processTx(i);
        txUploader.write(tx.serialize());
      }
      inputFileUrl = await txUploader.end();
    }

    // start Hadoop map-reduce operation
    const proof = await this.mapReduce.process(inputFileUrl, txCount);

    response.result = JSON.stringify(proof);

    if (request.case == Case.CASE_RUN_4) {
      this.mapReduce.onDemandInstances = false;
    }

    return response;
  };
}

export { Sequencer, SequencerServiceDefinition };
