# Hazook: Fask ZK-Rollup on Mina

Take your Mina (ZkApp) Rollup to the next level by using cloud compute to parallelize the accumulation of ZK Proofs. Hazook comes with a minimal sequencer implementation, the infra code to help you provision a running Hadoop cluster in AWS, and the necessary scripts and logic to leverage cloud-based Map Reduce for computing thousands of rollup proofs in parallel.

## Performance

| Transactions 	| Duration 	| Peak Instance Usage 	|
|-------------	|----------	|---------------------	|
| 8           	| 11min    	| 4                   	|
| 64          	| 33min    	| 22                  	|
| 256         	| 40min    	| 65                  	|

Instances used are AWS EC2 m5.xlarge (or similar sized instances). Refer [to here](sequencer/src/map-reduce/constants.ts) for the full list of potential instances the Hadoop cluster might use. The tests were conducted on a Zk-Rollup which modifies a single MerkleMap.

## Usage
You may bring your own ZkApp Rollup implemented in any way you see fit. However, you must implement a few classes that follow the abstractions [defined here](rollup/src/generics.ts). Currently the project runs a dummy ZkApp Rollup ([reference](rollup/src/myRollup.ts)) that you can use as your reference implementation. 

After implementing [these](rollup/src/generics.ts) abstractions, make sure to use them in the sequencer by updating [mapper.ts](sequencer/src/mapper.ts), [reducer.ts](sequencer/src/reducer.ts) [compiler.ts](sequencer/src/compiler.ts) and [sequencer.ts](sequencer/src/sequencer.ts).

To start the sequencer:
```bash
yarn sequencer start
```
This starts up a grpc server which can be used to run the demos. You can modify the server code to fit your needs [here](sequencer/src/server/services/sequencer.ts). There are 4 demos (demo1: 8 proofs, demo2: 64 proofs, demo3: 256 proofs, demo4: 1024 proofs).

To run the demo locally:
```bash
make run-demo
```

To run the demo on a deployed sequencer (demo-1):
```bash
grpcurl --insecure -d '{"case": 1}' "your_sequencer_host:your_sequencer_port" services.sequencer.v1.SequencerService/Demo
```


To run the map-reduce on a set of transactions:
```typescript
const MODE = MODES.EMR
const REGION = 'eu-central-1'
const client = new MapReduceClient<RollupProof>(MODE, REGION);

// First we need to upload your transactions to S3
const txUploader = client.uploader.uploadTransactionsToS3();
const transactions: MyTransaction[] = [/* ...your transactions */]
for (const tx of transactions) {
    txUploader.write(tx.serialize());
}
inputFileUrl = await txUploader.end();

// Then we can initialize a Hadoop cluster and start the map-reduce operation
const accumulatedProof = await client.process(inputFileUrl, transactions.length);
```

## Acceptable ZkPrograms
Your rollup (which is simply an o1-js ZkProgram) should work with Hazook almost out of the box, but it should be built as a Zk-Rollup as described in [Mina's documentation here](https://docs.minaprotocol.com/zkapps/tutorials/recursion#scaling-throughput-with-zkrollups-and-app-chains). To summarize, the ZkProgram should enable two functionalities: (1) a baseFunction which should generate and validate a base zk proof per transaction and (2) a mergeFunction which validates that two baseFunctions form a valid sequence and generates a proof of that. 

There's no requirement on the name or the inputs of these two functions; you can even have more than one baseFunction or mergeFunction. You just have to implement [these generics](rollup/src/generics.ts), specifically `TransactionBase.baseFn()` which should call the baseFunction/s of your ZkProgram and `RollupProofBase.merge()` which should call the mergeFunction/s of your ZkProgram.

## Deployment
Please refer [to this document](./accumulator/infra/README.md) for a detailed information of deploying Hazook. In addition to Terraform, the project currenly relies on Github Actions to upload the rollup compilation cache to the Hadoop cluster which speeds up processing. We encourage you to re-use the Github CI script included in this project.


## Security
The EMR cluster is in the public subnet for ease of development but for production use cases it should be moved to the private subnet ([refer to here](accumulator/infra/main.tf
)).

## Components
[Architecture Diagram](https://www.figma.com/file/ZW3PAXrm94laIdmhq4jJgN/Fast-ZK-Rollup-Architecture?type=whiteboard&node-id=880%3A1466&t=4ajDcNwZYJHTTSGM-1)

**Simple Rollup Sequencer Service**
- Containarized Node.js service that can be deployable to AWS EC2
- Terraform provisioning, Github Actions CI/CD
- Responsible for generating intermediate states and posting them to the MapReduce service

**Hadoop Cluster**
- A Hadoop Streaming cluster deployed and managed by AWS EMR, running in the same virtual network as the sequencer
- Parallelizes the generation of state proofs and reduces them into a single state proof recursively
- Terraform provisioning, Github Actions CI/CD

We purposefully left out the work of:
(1) Posting the accumulated zk proof to Mina L1 and
(2) Adding a grpc endpoint to which users can post transactions
So that developers can have full freedom to customize Hazook to their liking.
