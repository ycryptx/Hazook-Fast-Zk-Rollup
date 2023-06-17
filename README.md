# Fask ZK-Rollup on Mina

This project demonstrates a fast zk-rollup built on Mina that uses can handle large amounts of transaction by parallelizing the computation of constructing a recursive ZK state proof. This is an important proof point for the ability for Mina and any L2s on Mina to be able to handle high throughput, as well as a core component for any high throughput zkApp.

## Components

[Architecture Diagram](https://www.figma.com/file/ZW3PAXrm94laIdmhq4jJgN/Fast-ZK-Rollup-Architecture?type=whiteboard&node-id=880%3A1466&t=4ajDcNwZYJHTTSGM-1)

**Simple Rollup Sequencer Service**
- Containarized golang service deployed to a cloud compute platform e.g. AWS
- Exposed via an RPC server to which users can send rollup transactions
- Responsible for generating intermediate states and posting them to the MapReduce service
- Posts the recursive ZK state proof to Mina L1 received from MapReduce Service
- Terraform provisioning, Github Actions CI/CD

**MapReduce Service**
- A cloud-managed Apache Spark solution e.g. AWS EMR, running in the same virtual network as the sequencer
- Parallelizes the computation of state proofs and reduces them into a single state proof recursively
- Terraform provisioning, Github Actions CI/CD
