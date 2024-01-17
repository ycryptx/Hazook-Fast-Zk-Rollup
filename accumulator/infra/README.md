# Bootstrappping a EMR Cluster

This terraform deployment is fully automated. However, due to some AWS limitations, you'll have to bootstrap a few things before booting up your first EMR cluster.

## Prerequisites

- AWS CLI tool.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` AWS account env variables set.
- Terraform

## Setup

```
aws configure
aws emr create-default-roles
```

> [NOTE!] This will create the default AWS EMR roles. This deployment depends upon them. You only need to run this once per AWS account.

# Create aws resources for accumulator

Using terraform create buckets, network, ecr, ec2 instance, iam, etc.

1. Use provided example `./accumulator/infra/examples/main.tf`.
  - Adjust variable values.
  - Setup where to store terraform state(locally or s3)
2. Apply terraform changes:
```bash
terraform init
terraform plan
terraform apply
```
3. Infra among other related resources now should have following components:
  - ECR: `zk-rollup-docker-registry` where to store Sequencer image builds.
  - S3: `emr_input` for EMR incoming data.
  - S3: `emr_output` for EMR result data.
  - S3: `emr_data` for EMR meta data. It contains the code for the mappers/reducers, the bootstrap script, etc.
  - EC2: `nginx` and `sequencer`.
> [NOTE!] Sequencer image should be built and stored in above mentioned ECR. At the moment it's built by github actions workflow. Inspect the `publish` job for further details.

# Sequencer NixOS Configuration

The sequencer is launched on a NixOS EC2 machine. This machine runs the Sequencer docker image through a systemd-managed podman service. This service is reverse-proxied by Nginx.

# Sequencer EC2 Container

You can force the EC2 machine to load the latest Sequencer image via:

```sh
ssh youruser@3.120.144.49 "sudo systemctl restart podman-zk-rollup.service"
```

You can see the containers logs via:

```sh
ssh youruser@3.120.144.49 "journalctl -u podman-zk-rollup.service -f"
```
