# Bootstrappping a EMR Cluster

This terraform deployment is fully automated. However, due to some AWS limitations, you'll have to bootstrap a few things before booting up your first EMR cluster.

Note: you only need to run this once per AWS account.

You'll first need to install the AWS CLI tool. Set your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` AWS account env variables. Then, run:

```
aws configure
aws emr create-default-roles
```

This will create the default AWS EMR roles. This deployment depends upon them.
