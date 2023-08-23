import {
  EMRClient,
  RunJobFlowCommand,
  waitUntilClusterRunning,
  waitUntilStepComplete,
  AddJobFlowStepsCommand,
  ListClustersCommand,
  ClusterState,
  ScaleDownBehavior,
} from '@aws-sdk/client-emr';
import * as randString from 'randomstring';
import { Mode } from '../types';
import { Uploader } from '../uploader';
import { runShellCommand } from '../utils';

const MAX_MAP_REDUCE_WAIT_TIME = 60 * 60 * 2; // 2 hours

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
      ? this.processLocal(inputFile)
      : this.processEmr(inputFile);
  }

  private async processLocal(inputFile: string): Promise<string> {
    const outputDir = `/user/hduser/output-${randString.generate(7)}`;

    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    // initiate map-reduce
    runShellCommand(
      `docker exec ${container} hadoop jar /home/hduser/hadoop-3.3.3/share/hadoop/tools/lib/hadoop-streaming-3.3.3.jar \
        -D mapreduce.map.memory.mb=3072 \
        -D mapreduce.reduce.memory.mb=3072 \
        -D stream.num.map.output.key.fields=2 \
        -D mapreduce.partition.keypartitioner.options=-k1,1 \
        -D mapreduce.partition.keycomparator.options=-k2,2n \
        -D mapreduce.job.output.key.comparator.class=org.apache.hadoop.mapreduce.lib.partition.KeyFieldBasedComparator \
        -partitioner org.apache.hadoop.mapred.lib.KeyFieldBasedPartitioner \
        -mapper /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js \
        -reducer /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js \
        -input ${inputFile} \
        -output ${outputDir}`,
      true,
    );

    return this.uploader.getAccumulatedLocalHadoopOutput(container, outputDir);
  }

  private async processEmr(inputFile: string): Promise<string> {
    // get all available EMR clusters
    const clusters = await this.emrClient.send(
      new ListClustersCommand({
        ClusterStates: [
          ClusterState.WAITING,
          ClusterState.BOOTSTRAPPING,
          ClusterState.STARTING,
          ClusterState.RUNNING,
        ],
      }),
    );

    let clusterId: string;

    if (clusters.Clusters.length == 0) {
      // no cluster available so initialize it
      clusterId = await this.initCluster();
    } else {
      clusterId = clusters.Clusters[0].Id;
    }

    const outputDir = `output-${randString.generate(7)}`;
    const command = new AddJobFlowStepsCommand({
      JobFlowId: clusterId,
      Steps: [
        {
          Name: 'NodeJSStreamProcess',
          HadoopJarStep: {
            Jar: 'command-runner.jar',
            Args: [
              'hadoop-streaming',
              '-files',
              `s3://${process.env.BUCKET_PREFIX}-emr-data/mapper.js,s3://${process.env.BUCKET_PREFIX}-emr-data/reducer.js`,
              '-partitioner',
              'org.apache.hadoop.mapred.lib.KeyFieldBasedPartitioner',
              '-input',
              `s3://${inputFile}`,
              '-output',
              `s3://${process.env.BUCKET_PREFIX}-emr-output/${outputDir}`,
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

    const start = Date.now();

    const data = await this.emrClient.send(command);
    console.log(`EMR AddJobFlowSteps: ${data.$metadata} ${data.StepIds}`);
    await waitUntilStepComplete(
      { client: this.emrClient, maxWaitTime: MAX_MAP_REDUCE_WAIT_TIME },
      {
        ClusterId: clusterId,
        StepId: data.StepIds[0],
      },
    );
    const result = await this.uploader.getAccumulatedEMROutput(outputDir);

    const end = Date.now();
    console.log(`Demo finished`);
    console.log(`Result: ${result}`);
    console.log(`Running time: ${end - start} ms`);

    return result;
  }

  async initCluster(): Promise<string> {
    const command = new RunJobFlowCommand({
      Name: 'accumulator',
      LogUri: `s3://${process.env.BUCKET_PREFIX}-emr-data`,
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
      Configurations: [
        // {
        //   Classification: 'yarn-site',
        //   Properties: {
        //     'yarn.nodemanager.resource.cpu-vcores': '16', // Set the number of CPU cores allocated to each core node
        //     'yarn.nodemanager.resource.memory-mb': '24576', // Set the amount of memory (in MB) allocated to each core node (24 GB)
        //   },
        // },
        {
          Classification: 'mapred-site',
          Properties: {
            'mapreduce.map.cpu.vcores': '1',
            'mapreduce.reduce.cpu.vcores': '1',
            'mapreduce.map.memory.mb': '5120',
            'mapreduce.reduce.memory.mb': '5120',
            'mapreduce.task.timeout': '0',
            'mapreduce.map.output.compress': 'true',
            'mapreduce.map.output.compress.codec':
              'org.apache.hadoop.io.compress.SnappyCodec',
            'stream.num.map.output.key.fields': '2',
            'mapred.text.key.partitioner.options': '-k1,1',
            'mapred.text.key.comparator.options': '-k2,2n',
            'mapreduce.job.output.key.comparator.class':
              'org.apache.hadoop.mapred.lib.KeyFieldBasedComparator',
            'map.output.key.field.separator': '\t',
            'stream.map.output.field.separator': '\t',
          },
        },
      ],
      Instances: {
        InstanceFleets: [
          {
            InstanceFleetType: 'MASTER',
            TargetSpotCapacity: 1,
            InstanceTypeConfigs: [
              {
                InstanceType: 'm5.xlarge', // Master instance type
                BidPrice: '0.5',
              },
            ],
          },
          {
            InstanceFleetType: 'CORE',
            TargetSpotCapacity: 1, // Number of core instances
            InstanceTypeConfigs: [
              {
                InstanceType: 'm5.4xlarge', // Core instance type
                BidPrice: '0.5',
              },
            ],
          },
        ],
        KeepJobFlowAliveWhenNoSteps: true,
      },
      ScaleDownBehavior: ScaleDownBehavior.TERMINATE_AT_TASK_COMPLETION,
      Applications: [
        {
          Name: 'Hadoop',
        },
      ],
    });

    try {
      const { JobFlowId } = await this.emrClient.send(command);
      console.log('EMR job started successfully. JobFlowId:', JobFlowId);

      // Wait for the EMR job to complete
      await this.waitForClusterRunning(JobFlowId);
      return JobFlowId;
    } catch (err) {
      console.error('Error initializing EMR cluster:', err);
      throw err;
    }
  }

  private async waitForClusterRunning(jobFlowId): Promise<void> {
    console.log('Waiting for cluster to be ready...');
    const describeClusterParams = { ClusterId: jobFlowId };
    await waitUntilClusterRunning(
      { client: this.emrClient, maxWaitTime: 600000 },
      describeClusterParams,
    );
    console.log('EMR Cluster is ready');
  }
}
