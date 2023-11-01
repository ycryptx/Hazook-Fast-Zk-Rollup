# Hazook: Fask ZK-Rollup on Mina

Take your Mina (ZkApp) Rollup to the next level by using cloud compute to parallelize the accumulation of ZK Proofs. Hazook comes with a minimal sequencer implementation, the infra code to help you provision a running Hadoop cluster in AWS, and the necessary scripts and logic to leverage cloud-based Map Reduce for computing thousands of rollup proofs in parallel.

## Usage
You may bring your own ZkApp Rollup implemented in any way you see fit. However, you must implement a few classes that follow the abstractions [defined here](rollup/src/generics.ts). Currently the project runs a dummy ZkApp Rollup ([reference](rollup/src/myRollup.ts)) that you can use as your reference implementation. 

After implementing [these](rollup/src/generics.ts) abstractions, make sure to use them in the sequencer by updating [mapper.ts](sequencer/src/mapper.ts), [reducer.ts](sequencer/src/reducer.ts) and [sequencer.ts](sequencer/src/sequencer.ts).

## [Deployment](./accumulator/infra/README.md)
TODO:  missing a general overview including explanation about deployment of the sequencer, the hadoop cluster, and instructions about terraform

## Components
[Architecture Diagram](https://www.figma.com/file/ZW3PAXrm94laIdmhq4jJgN/Fast-ZK-Rollup-Architecture?type=whiteboard&node-id=880%3A1466&t=4ajDcNwZYJHTTSGM-1)

**Simple Rollup Sequencer Service**
- Containarized Node.js service that can be deployable to AWS EC2
- Terraform provisioning, Github Actions CI/CD
- Responsible for generating intermediate states and posting them to the MapReduce service
- Exposed via an RPC server to which users can send rollup transactions (TODO)
- Posts the recursive ZK state proof to Mina L1 received from MapReduce Service (TODO)

**MapReduce Service**
- A Hadoop Streaming cluster deployed and managed by AWS EMR, running in the same virtual network as the sequencer
- Parallelizes the generation of state proofs and reduces them into a single state proof recursively
- Terraform provisioning, Github Actions CI/CD
