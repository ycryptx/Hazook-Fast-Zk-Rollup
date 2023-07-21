import {
  EMRClient,
  RunJobFlowCommand,
  DescribeClusterCommand,
  waitUntilClusterRunning,
  waitUntilClusterTerminated,
  waitUntilStepComplete,
  AddJobFlowStepsCommand,
  ListClustersCommand,
  ClusterState,
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
    // we can cache this
    const clusters = await this.emrClient.send(
      new ListClustersCommand({ ClusterStates: [ClusterState.WAITING] }),
    );

    const outputFile = `output-${randString.generate(7)}`;
    const command = new AddJobFlowStepsCommand({
      JobFlowId: clusters.Clusters[0].Id,
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
    console.log('Map reduce result:', result);
    return result;
  }

  async _runJobFlow(inputFile: string): Promise<string> {
    const outputFile = `output-${randString.generate(7)}`;
    const command = new RunJobFlowCommand({
      Name: 'accumulator',
      BootstrapActions: [
        {
          Name: 'install-nodejs',
          ScriptBootstrapAction: {
            Path: `s3://${process.env.BUCKET_PREFIX}-emr-data/emr_bootstrap_script.sh`,
          },
        },
      ],
      ReleaseLabel: 'emr-6.11.0', // EMR release version
      ServiceRole: 'EMR_DefaultRole',
      JobFlowRole: 'emr-ec2-profile',
      Instances: {
        InstanceFleets: [
          {
            InstanceFleetType: 'MASTER',
            TargetOnDemandCapacity: 1, // Number of master instances
            InstanceTypeConfigs: [
              {
                InstanceType: 'm5.xlarge', // Master instance type
              },
            ],
          },
          {
            InstanceFleetType: 'CORE',
            TargetOnDemandCapacity: 1, // Number of core instances
            InstanceTypeConfigs: [
              {
                InstanceType: 'm5.xlarge', // Core instance type
              },
            ],
          },
        ],
        KeepJobFlowAliveWhenNoSteps: true,
      },
      Applications: [
        {
          Name: 'Hadoop',
        },
      ],
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

    try {
      const { JobFlowId } = await this.emrClient.send(command);
      console.log('EMR job started successfully. JobFlowId:', JobFlowId);

      // Wait for the EMR job to complete
      await this._waitForJobCompletion(JobFlowId);
      const result = await this.uploader.getObject(outputFile);
      return result;
    } catch (err) {
      console.error('Error starting EMR job:', err);
      throw err;
    }
  }

  async _waitForJobCompletion(jobFlowId): Promise<void> {
    const describeClusterParams = { ClusterId: jobFlowId };

    try {
      console.log('Waiting for cluster to be running...');
      await this.emrClient.send(
        new DescribeClusterCommand(describeClusterParams),
      );
      await waitUntilClusterRunning(
        { client: this.emrClient, maxWaitTime: 600000 },
        describeClusterParams,
      );

      console.log('Cluster is now running.');

      // Wait for the cluster to reach a terminal state (COMPLETED, FAILED, or TERMINATED)
      await waitUntilClusterTerminated(
        { client: this.emrClient, maxWaitTime: MAX_MAP_REDUCE_WAIT_TIME },
        describeClusterParams,
      );
      console.log('EMR job completed.');
    } catch (err) {
      console.error('Error waiting for cluster or EMR job termination:', err);
      throw err;
    }
  }
}
