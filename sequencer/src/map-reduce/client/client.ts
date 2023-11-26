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
import { runShellCommand } from '../utils';
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
import { logger } from '../../utils';

export class MapReduceClient<RollupProof extends RollupProofBase> {
  public uploader: Uploader<RollupProof>;
  private mode: Mode;
  private emrClient?: EMRClient;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    this.uploader = new Uploader<RollupProof>(mode, region);

    if (this.mode == Mode.EMR) {
      this.emrClient = new EMRClient({ region });
    }
  }

  /**
   * Run the parallelized MapReduce operation to accumulate the proofs
   *
   * @param inputFileURL URL/path to an input file containing transactions to process (e.g. s3://my-bucket-input-data/transactions.txt)
   * @returns the accumulated proof
   */
  public async process(
    inputFileURL: string,
    transactionCount: number,
  ): Promise<RollupProof> {
    let firstRun = true;
    const start = Date.now();
    let outputLocation: string,
      proofCount = transactionCount;

    // eslint-disable-next-line no-constant-condition
    while (proofCount > 1) {
      outputLocation = await (this.mode == Mode.LOCAL
        ? this.processLocal(inputFileURL, firstRun)
        : this.processEmr(inputFileURL, proofCount, firstRun));

      proofCount = Math.ceil(proofCount / REDUCER_SEQUENTIALISM);
      firstRun = false;
      logger.info(`map reduce down to ${proofCount} proofs`);

      if (proofCount > 1) {
        inputFileURL = await this.uploader.uploadIntermediateProofs(
          outputLocation,
        );
      }
    }

    logger.info(
      `Map reduce finished! Total running time ${Date.now() - start}`,
    );
    logger.info('Fetching batched proof...');

    const proofs = await this.uploader.getOutput(outputLocation);
    // sanity check
    if (proofs.length != 1) {
      throw new Error(`Expected 1 proof but got ${proofs.length}`);
    }
    return proofs[0];
  }

  /**
   *
   * @param inputFile
   * @returns
   */
  private async processLocal(
    inputFile: string,
    firstRun: boolean,
  ): Promise<string> {
    const outputDir = `/user/hduser/output-${randString.generate(7)}`;

    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    let args = `docker exec ${container} hadoop jar /home/hduser/hadoop-3.3.3/share/hadoop/tools/lib/hadoop-streaming-3.3.3.jar \
    -D mapreduce.map.memory.mb=3072 \
    -D mapreduce.reduce.memory.mb=3072 \
    -D mapreduce.input.lineinputformat.linespermap=4 \
    -mapper /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js \
    -reducer /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js \
    -input ${inputFile} \
    -output ${outputDir}`;

    const nlineInputFormatArg = ` \
    -inputformat org.apache.hadoop.mapred.lib.NLineInputFormat`;

    if (firstRun) {
      args += nlineInputFormatArg;
    }

    // initiate map-reduce
    runShellCommand(args, true);
    return outputDir;
  }

  /**
   *
   * @param inputFile
   * @param numberOfProofs
   * @returns the URL of the output data directory (e.g. s3://my-bucket-output-data/output-123/)
   */
  private async processEmr(
    inputFileURL: string,
    numberOfProofs: number,
    firstRun: boolean,
  ): Promise<string> {
    const outputDir = `output-${randString.generate(7)}`;
    const Args = [
      'hadoop-streaming',
      '-files',
      `s3://${process.env.BUCKET_PREFIX}-emr-data/mapper.js,s3://${process.env.BUCKET_PREFIX}-emr-data/reducer.js`,
      '-D',
      `mapred.reduce.tasks=${
        Math.round(numberOfProofs / REDUCER_SEQUENTIALISM) + 1
      }`,
      '-input',
      `${inputFileURL}`,
      '-output',
      `s3://${process.env.BUCKET_PREFIX}-emr-output/${outputDir}`,
      '-mapper',
      'mapper.js',
      '-reducer',
      'reducer.js',
    ];

    if (firstRun) {
      const linesPerMapArg = [
        '-D',
        `mapreduce.input.lineinputformat.linespermap=${1}`,
      ];
      const nlineInputFormatArg = [
        '-inputformat',
        'org.apache.hadoop.mapred.lib.NLineInputFormat',
      ];
      Args.splice(3, 0, ...linesPerMapArg);
      Args.push(...nlineInputFormatArg);
    }

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

    const command = new AddJobFlowStepsCommand({
      JobFlowId: clusterId,
      Steps: [
        {
          Name: 'NodeJSStreamProcess',
          HadoopJarStep: {
            Jar: 'command-runner.jar',
            Args,
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
      logger.info(
        `EMR job ${data.StepIds} added. Output location: ${outputDir}`,
      );
      const waiterResult = await waitUntilStepComplete(
        {
          client: this.emrClient,
          maxWaitTime: MAX_MAP_REDUCE_WAIT_TIME,
          minDelay: 10,
          maxDelay: 60,
        },
        {
          ClusterId: clusterId,
          StepId: data.StepIds[0],
        },
      );

      if (waiterResult.state !== 'SUCCESS') {
        const errMsg = `EMR job ${data.StepIds} failed! ${waiterResult.state} ${waiterResult.reason}`;
        logger.error(errMsg);
        throw new Error(errMsg);
      }

      logger.info(
        `EMR job ${data.StepIds} finished! Running time: ${
          Date.now() - start
        } ms`,
      );
      return outputDir;
    } catch (err) {
      logger.error('EMR processing error', err);
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

  private async autoScale(args: {
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
        ResizeSpecifications: {
          SpotResizeSpecification: {
            TimeoutDurationMinutes: 20,
          },
          OnDemandResizeSpecification: {
            TimeoutDurationMinutes: 5,
          },
        },
      },
    });
    logger.info(`EMR: autoscaling cluster to ${targetSpotNodes} spot nodes`);

    try {
      await this.emrClient.send(command);
      logger.info(`EMR: autoscaling in progress...`);
      return;
    } catch (err) {
      logger.error('Error autoscaling EMR cluster:', err);
      throw err;
    }
  }

  private async initCluster(): Promise<{
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
            'stream.map.output.field.separator': '\t',
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
      logger.info('EMR job started successfully. JobFlowId:', JobFlowId);

      // Wait for the EMR job to complete
      await this.waitForClusterRunning(JobFlowId);

      const taskFleetDetails = await this.getRunningTaskFleetDetails(JobFlowId);
      return { clusterId: JobFlowId, taskFleetDetails };
    } catch (err) {
      logger.error('Error initializing EMR cluster:', err);
      throw err;
    }
  }

  private async getRunningTaskFleetDetails(
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
    logger.info('Waiting for cluster to be ready...');
    const describeClusterParams = { ClusterId: jobFlowId };
    await waitUntilClusterRunning(
      { client: this.emrClient, maxWaitTime: 600000 },
      describeClusterParams,
    );
    logger.info('EMR Cluster is ready');
  }
}
