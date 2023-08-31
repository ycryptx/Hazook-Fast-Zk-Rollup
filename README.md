# Fask ZK-Rollup on Mina

This project demonstrates a fast zk-rollup built on Mina that can handle large amounts of transaction by parallelizing the accumulation of recursive zk proofs. This is an important proof point for the ability for Mina and any L2s on Mina to be able to handle high throughput, as well as a core component for any high throughput zkApp. This repo can also be extended to support other proving systems in the future.

## Components

[Architecture Diagram](https://www.figma.com/file/ZW3PAXrm94laIdmhq4jJgN/Fast-ZK-Rollup-Architecture?type=whiteboard&node-id=880%3A1466&t=4ajDcNwZYJHTTSGM-1)

**Simple Rollup Sequencer Service**
- Containarized Node.js service that can be deployable to AWS EC2
- Responsible for generating intermediate states and posting them to the MapReduce service
- Exposed via an RPC server to which users can send rollup transactions (TODO)
- Posts the recursive ZK state proof to Mina L1 received from MapReduce Service (TODO)
- Terraform provisioning, Github Actions CI/CD

**MapReduce Service**
- A Hadoop Streaming cluster deployed and managed by AWS EMR, running in the same virtual network as the sequencer
- Parallelizes the computation of state proofs and reduces them into a single state proof recursively
- Terraform provisioning, Github Actions CI/CD
