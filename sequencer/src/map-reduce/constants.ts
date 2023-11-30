import { EbsConfiguration, InstanceTypeConfig } from '@aws-sdk/client-emr';

const EbsConfiguration: EbsConfiguration = {
  EbsBlockDeviceConfigs: [
    {
      VolumeSpecification: {
        SizeInGB: 10,
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
export const YARN_CONTAINER_MEMORY = 4096;
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
 * because we're running on ?.xlarge instances (16gb of memory) and each container has 4gb of memory each container
 * can run 3 containers in parallel. This value should be modified if instance types are changed
 */
export const PROOFS_PER_TASK_NODE =
  Math.floor(16384 / YARN_CONTAINER_MEMORY) - 1;
/**
 * Each parallel Hadoop container running the reduce step
 * should not compute more than 2 proofs if there are enough cores
 */
export const REDUCER_SEQUENTIALISM = 2;

/**
 * The bid price for spot instances in US Dollars (modify this as you please)
 */
export const SPOT_BID_PRICE_DOLLARS = '0.5';

/**
 * The instance types the Hadoop cluster can use when it provisions / autoscales itself.
 * For now we only support instances of different families but similar size.
 */
export const INSTANCE_TYPES: InstanceTypeConfig[] = [
  {
    InstanceType: 'm5.xlarge',
    BidPrice: SPOT_BID_PRICE_DOLLARS,
    EbsConfiguration,
  },
  {
    InstanceType: 'm5d.xlarge',
    BidPrice: SPOT_BID_PRICE_DOLLARS,
    EbsConfiguration,
  },
  {
    InstanceType: 'm6a.xlarge',
    BidPrice: SPOT_BID_PRICE_DOLLARS,
    EbsConfiguration,
  },
  {
    InstanceType: 'm6g.xlarge',
    BidPrice: SPOT_BID_PRICE_DOLLARS,
    EbsConfiguration,
  },
  {
    InstanceType: 'm6i.xlarge',
    BidPrice: SPOT_BID_PRICE_DOLLARS,
    EbsConfiguration,
  },
];
