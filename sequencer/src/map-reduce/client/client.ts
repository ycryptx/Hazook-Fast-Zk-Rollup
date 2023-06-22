import {
  EMRClient,
  AddInstanceFleetCommand,
  AddInstanceFleetCommandInput,
} from '@aws-sdk/client-emr';
import { Mode } from '../types';

export class MapReduceClient {
  private mode: Mode;
  private emrClient?: EMRClient;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    if (this.mode == Mode.EMR) {
      this.emrClient = new EMRClient({ region });
    }
  }

  async process(): Promise<void> {
    return this.mode == Mode.LOCAL ? this._processLocal() : this._processEmr();
  }

  private async _processLocal(): Promise<void> {
    return;
  }

  private async _processEmr(): Promise<void> {
    const params: AddInstanceFleetCommandInput = {
      ClusterId: '',
      InstanceFleet: undefined,
    };
    const command = new AddInstanceFleetCommand(params);

    try {
      const data = await this.emrClient.send(command);
      console.log(data);
      // process data.
    } catch (error) {
      // error handling.
    } finally {
      // finally.
    }
  }
}
