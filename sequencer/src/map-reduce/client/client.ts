import {
  EMRClient,
  AddJobFlowStepsCommand,
  waitUntilStepComplete,
} from '@aws-sdk/client-emr';
import * as randString from 'randomstring';
import { Mode } from '../types';
import { Uploader } from '../uploader';
import { runShellCommand } from '../utils';

const MAX_MAP_REDUCE_WAIT_TIME = 10 * 60 * 1000; // 10 minutes

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
  async process(inputFile: string): Promise<string> {
    return this.mode == Mode.LOCAL
      ? this._processLocal(inputFile)
      : this._processEmr(inputFile);
  }

  private async _processLocal(inputFile: string): Promise<string> {
    const outputDir = `/user/hduser/output-${randString.generate(7)}`;

    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    // initiate map-reduce
    runShellCommand(
      `docker exec ${container} hadoop jar /home/hduser/hadoop-3.3.3/share/hadoop/tools/lib/hadoop-streaming-3.3.3.jar -mapper /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js -reducer /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js -input ${inputFile} -output ${outputDir}`,
    );

    // get result
    const hadoopResult = runShellCommand(
      `docker exec ${container} hdfs dfs -cat ${outputDir}/*`,
    );

    return (hadoopResult || '').toString().trim();
  }

  private async _processEmr(inputFile: string): Promise<string> {
    const outputFile = `output-${randString.generate(7)}`;
    const command = new AddJobFlowStepsCommand({
      JobFlowId: '',
      Steps: [
        {
          Name: 'NodeJSStreamProcess',
          HadoopJarStep: {
            Jar: 'command-runner.jar',
            Args: [
              'streaming',
              '-files',
              `s3://${process.env.BUCKET_PREFIX}-emr-data/mapper.js,s3://${process.env.BUCKET_PREFIX}-emr-data/reducer.js`,
              '-input',
              `s3://${process.env.BUCKET_PREFIX}-emr-data/${inputFile}`,
              '-output',
              `s3://${process.env.BUCKET_PREFIX}-emr-output/${outputFile}`, // replace with your output bucket
              '-mapper',
              'mapper.js',
              '-reducer',
              'reducer.js',
            ],
          },
          ActionOnFailure: 'CONTINUE',
        },
      ],
    });

    const data = await this.emrClient.send(command);
    console.log(`EMR AddJobFlowSteps: ${data.$metadata} ${data.StepIds}`);
    await waitUntilStepComplete(
      { client: this.emrClient, maxWaitTime: MAX_MAP_REDUCE_WAIT_TIME },
      {
        ClusterId: '',
        StepId: data.StepIds[0],
      },
    );
    const result = await this.uploader.getObject(outputFile);
    return result;
  }
}
