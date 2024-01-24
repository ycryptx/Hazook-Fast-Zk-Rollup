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

 > [NOTE!] if preferred, you can run terraform directly from infra folder setting variables with `-var` or `-var-file`

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

 4. Now that the infra components are in place, run steps described in GitHub actions workflow. After they successfully run, you should have:
  - A zk rollup image that is published to ECR repository(created with Terraform on the 2nd step).
  - <s3-prefix>-emr-data bucket that contains `emr_bootstrap_script.sh`, `mapper.js`, `reducer.js` and `compilation/`

 5. On EC2 instance aws console page look up IP address as well as DNS name.

 6. Terraform when creating an EC2 instance tried starting `podman-zk-rollup.service` however at that stage image as well as ERC repository did not exist yet. Therefore, restart the `podman-zk-rollup` service. See bellow.

 7. You should be able to use `ec2-instance-dns-name:443` with `grpcurl`.

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

# Cleaning up

To undo everything follow these steps:
 1. Delete everything from emr-`{input,output,data}` buckets.
 2. Delete all docker images from ECR.
 3. run `terraform destroy`
