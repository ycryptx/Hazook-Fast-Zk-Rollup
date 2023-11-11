import * as path from 'path';
import * as fs from 'fs';
import {
  EMRClient,
  RunJobFlowCommand,
  ModifyInstanceFleetCommand,
  waitUntilClusterRunning,
  waitUntilStepComplete,
  AddJobFlowStepsCommand,
  ListClustersCommand,
  ClusterState,
  ScaleDownBehavior,
  InstanceFleet,
  ListInstanceFleetsCommand,
} from '@aws-sdk/client-emr';
import * as randString from 'randomstring';
import { Mode } from '../types';
import { Uploader } from '../uploader';
import { runShellCommand, preProcessRawTransactions } from '../utils';
import { RollupProofBase } from '@ycryptx/rollup';
import {
  YARN_CONTAINER_MEMORY,
  MAX_MAP_REDUCE_WAIT_TIME,
  TASK_NODE_FLEET_NAME,
  TASK_NODE_FLEET_IDLE_TARGET_CAPACITY,
  PROOFS_PER_TASK_NODE,
  INSTANCE_TYPES,
  REDUCER_SEQUENTIALISM,
} from '../constants';

export class MapReduceClient<RollupProof extends RollupProofBase> {
  private mode: Mode;
  private uploader: Uploader<RollupProof>;
  private emrClient?: EMRClient;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    this.uploader = new Uploader<RollupProof>(mode, region);

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
  async process(inputFile: string): Promise<RollupProof> {
    const { preprocessedFile, lineNumber } = await preProcessRawTransactions(
      inputFile,
    );
    const absPathInputFile = path.join(__dirname, '../', preprocessedFile);
    let proofs: RollupProof[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // upload data to Hadoop
      const inputLocation = await this.uploader.upload(absPathInputFile);

      proofs = await (this.mode == Mode.LOCAL
        ? this.processLocal(inputLocation)
        : this.processEmr(
            inputLocation,
            proofs.length > 0 ? proofs.length : lineNumber,
          ));

      console.log(`map reduce down to ${proofs.length} proofs`);

      if (proofs.length <= 1) {
        break;
      }

      fs.unlinkSync(absPathInputFile);

      for (let i = 0; i < proofs.length; i++) {
        fs.appendFileSync(
          absPathInputFile,
          `${i}\t${REDUCER_SEQUENTIALISM}\t${'1'}\t${JSON.stringify(
            proofs[i].toJSON(),
          )}\n`,
        );
      }
    }
    console.log(`map reduce finished`);
    return proofs[0];
  }

  private async processLocal(inputFile: string): Promise<RollupProof[]> {
    const outputDir = `/user/hduser/output-${randString.generate(7)}`;

    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    // initiate map-reduce
    runShellCommand(
      `docker exec ${container} hadoop jar /home/hduser/hadoop-3.3.3/share/hadoop/tools/lib/hadoop-streaming-3.3.3.jar \
        -D mapreduce.map.memory.mb=3072 \
        -D mapreduce.reduce.memory.mb=3072 \
        -mapper /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js \
        -reducer /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js \
        -input ${inputFile} \
        -output ${outputDir}`,
      true,
    );

    return this.uploader.getLocalHadoopOutput(container, outputDir);
  }

  private async processEmr(
    inputFile: string,
    numberOfProofs: number,
  ): Promise<RollupProof[]> {
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

    let clusterId: string, taskFleetDetails: InstanceFleet;

    if (clusters.Clusters.length == 0) {
      // no cluster available so initialize it
      const { clusterId: _clusterId, taskFleetDetails: _taskFleetDetails } =
        await this.initCluster();
      clusterId = _clusterId;
      taskFleetDetails = _taskFleetDetails;
    } else {
      clusterId = clusters.Clusters[0].Id;
      taskFleetDetails = await this.getRunningTaskFleetDetails(clusterId);
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
              '-D',
              `mapreduce.input.lineinputformat.linespermap=${1}`,
              '-input',
              `s3://${inputFile}`,
              '-output',
              `s3://${process.env.BUCKET_PREFIX}-emr-output/${outputDir}`,
              '-mapper',
              'mapper.js',
              '-reducer',
              'reducer.js',
              '-inputformat',
              'org.apache.hadoop.mapred.lib.NLineInputFormat',
            ],
          },
          ActionOnFailure: 'CONTINUE',
        },
      ],
    });

    try {
      // scale up / down depending on the input size
      await this.autoScale({
        clusterId,
        instanceFleetId: taskFleetDetails.Id,
        targetSpotNodes: Math.round(numberOfProofs / PROOFS_PER_TASK_NODE) + 1,
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

      const result = await this.uploader.getEMROutput(outputDir);

      const end = Date.now();
      console.log(`Running time: ${end - start} ms`);

      return result;
    } catch (err) {
      console.log('EMR processing error', err);
      throw err;
    } finally {
      // scale down
      await this.autoScale({
        clusterId,
        instanceFleetId: taskFleetDetails.Id,
        targetSpotNodes: TASK_NODE_FLEET_IDLE_TARGET_CAPACITY,
      });
    }
  }

  async autoScale(args: {
    clusterId: string;
    instanceFleetId: string;
    targetSpotNodes: number;
  }): Promise<void> {
    const { clusterId, instanceFleetId, targetSpotNodes } = args;
    const command = new ModifyInstanceFleetCommand({
      ClusterId: clusterId,
      InstanceFleet: {
        InstanceFleetId: instanceFleetId,
        TargetSpotCapacity: targetSpotNodes,
        TargetOnDemandCapacity: 0,
      },
    });
    console.log(`EMR: autoscaling cluster to ${targetSpotNodes} spot nodes`);

    try {
      await this.emrClient.send(command);
      console.log(`EMR: autoscaling in progress...`);
      return;
    } catch (err) {
      console.error('Error autoscaling EMR cluster:', err);
      throw err;
    }
  }

  async initCluster(): Promise<{
    clusterId: string;
    taskFleetDetails: InstanceFleet;
  }> {
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
        {
          Classification: 'mapred-site',
          Properties: {
            'mapreduce.map.cpu.vcores': '1',
            'mapreduce.reduce.cpu.vcores': '1',
            'mapreduce.map.memory.mb': `${YARN_CONTAINER_MEMORY}`,
            'mapreduce.reduce.memory.mb': `${YARN_CONTAINER_MEMORY}`,
            'mapreduce.task.timeout': '0',
            'mapreduce.task.stuck.timeout-ms': '0',
            'mapreduce.map.speculative': 'false',
            'mapreduce.reduce.speculative': 'false',
            'mapreduce.map.output.compress': 'true',
            'mapreduce.map.output.compress.codec':
              'org.apache.hadoop.io.compress.SnappyCodec',
          },
        },
      ],
      Instances: {
        InstanceFleets: [
          {
            InstanceFleetType: 'MASTER',
            TargetOnDemandCapacity: 1,
            InstanceTypeConfigs: INSTANCE_TYPES,
          },
          {
            InstanceFleetType: 'CORE',
            TargetOnDemandCapacity: 1, // Number of core instances
            InstanceTypeConfigs: INSTANCE_TYPES,
          },
          {
            Name: TASK_NODE_FLEET_NAME,
            InstanceFleetType: 'TASK',
            TargetSpotCapacity: TASK_NODE_FLEET_IDLE_TARGET_CAPACITY, // Number of task instances
            InstanceTypeConfigs: INSTANCE_TYPES,
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

      const taskFleetDetails = await this.getRunningTaskFleetDetails(JobFlowId);
      return { clusterId: JobFlowId, taskFleetDetails };
    } catch (err) {
      console.error('Error initializing EMR cluster:', err);
      throw err;
    }
  }

  public async getRunningTaskFleetDetails(
    clusterId: string,
  ): Promise<InstanceFleet> {
    const InstanceFleets = await this.emrClient.send(
      new ListInstanceFleetsCommand({ ClusterId: clusterId }),
    );
    return InstanceFleets.InstanceFleets.find(
      (fleet) => fleet.Name == TASK_NODE_FLEET_NAME,
    );
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
