import {
  EMRClient,
  AddInstanceFleetCommand,
  AddInstanceFleetCommandInput,
} from '@aws-sdk/client-emr';
import * as randString from 'randomstring';
import { Mode } from '../types';
import { Uploader } from '../uploader';
import { runShellCommand } from '../utils';

export class MapReduceClient {
  private mode: Mode;
  private uploader: Uploader;
  private emrClient?: EMRClient;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    this.uploader = new Uploader(mode, region);

    if (this.mode == Mode.EMR) {
      this.emrClient = new EMRClient({ region });
    }
  }

  public async upload(filePath: string): Promise<string> {
    return this.uploader.upload(filePath);
  }

  /**
   * Run the parallelized MapReduce operation
   *
   * @param inputFile the location of the input file that Map-Reduce should process
   * @returns the result of the MapReduce
   */
  async process(inputFile: string): Promise<any> {
    return this.mode == Mode.LOCAL
      ? this._processLocal(inputFile)
      : this._processEmr(inputFile);
  }

  private async _processLocal(inputFile: string): Promise<any> {
    const outputDir = `/user/hduser/output-${randString.generate(7)}`;

    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    // initiate map-reduce
    runShellCommand(
      `docker exec ${container} hadoop jar /home/hduser/hadoop-3.3.3/share/hadoop/tools/lib/hadoop-streaming-3.3.3.jar -mapper /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js -reducer /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js -input ${inputFile} -output ${outputDir}`,
    );

    // get result
    return runShellCommand(
      `docker exec ${container} hdfs dfs -cat ${outputDir}/*`,
    );
  }

  private async _processEmr(inputFile: string): Promise<void> {
    inputFile;
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
