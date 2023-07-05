# Bootstrappping a EMR Cluster

This terraform deployment is fully automated. However, due to some AWS limitations, you'll have to bootstrap a few things before booting up your first EMR cluster.

Note: you only need to run this once per AWS account.

You'll first need to install the AWS CLI tool. Set your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` AWS account env variables. Then, run:

```
aws configure
aws emr create-default-roles
```

This will create the default AWS EMR roles. This deployment depends upon them.

# Sequencer NixOS Configuration

The sequencer is launched on a NixOS EC2 machine. This machine runs the Sequencer docker image through a systemd-managed podman service. This service is reverse-proxied by Nginx.
