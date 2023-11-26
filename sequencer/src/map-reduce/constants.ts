import { EbsConfiguration, InstanceTypeConfig } from '@aws-sdk/client-emr';

const EbsConfiguration: EbsConfiguration = {
  EbsBlockDeviceConfigs: [
    {
      VolumeSpecification: {
        SizeInGB: 3,
        VolumeType: 'gp2',
      },
      VolumesPerInstance: 1,
    },
  ],
  EbsOptimized: true,
};

/**
 * The amount of memory to allocate to each Hadoop container generating the proof in the map-reduce operation
 */
export const YARN_CONTAINER_MEMORY = 5120;
/**
 * The amount of time the sequencer will wait for a single map-reduce step to finish
 */
export const MAX_MAP_REDUCE_WAIT_TIME = 60 * 60 * 2; // 2 hours
/**
 * The name of the task node instance fleet. This fleet is used for manual autoscaling
 */
export const TASK_NODE_FLEET_NAME = 'TASK-NODE-FLEET';
/**
 * How many task nodes to run by default
 */
export const TASK_NODE_FLEET_IDLE_TARGET_CAPACITY = 1;
/**
 * because we're running on ?.xlarge instances (16gb of memory) and each container has 5gb of memory each container
 * can run 3 containers in parallel. This value should be modified if either instance types are changed or if YARN_CONTAINER_MEMORY
 * is changed
 */
export const PROOFS_PER_TASK_NODE = 2;
/**
 * Each parallel Hadoop container running the reduce step
 * should not compute more than 2 proofs if there are enough cores
 */
export const REDUCER_SEQUENTIALISM = 2;

/**
 * The instance types the Hadoop cluster can use when it provisions / autoscales itself.
 * For now we only support instances of different families but similar size.
 */
export const INSTANCE_TYPES: InstanceTypeConfig[] = [
  {
    InstanceType: 'm4.xlarge',
    BidPrice: '0.5',
    EbsConfiguration,
  },
  {
    InstanceType: 'm5.xlarge',
    BidPrice: '0.5',
    EbsConfiguration,
  },
  {
    InstanceType: 'm6a.xlarge',
    BidPrice: '0.5',
    EbsConfiguration,
  },
  {
    InstanceType: 'm6g.xlarge',
    BidPrice: '0.5',
    EbsConfiguration,
  },
  {
    InstanceType: 'm6i.xlarge',
    BidPrice: '0.5',
    EbsConfiguration,
  },
];
