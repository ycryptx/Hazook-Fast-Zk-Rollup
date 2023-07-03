variable "region" {
  description = "AWS Deployment region."
  default = "eu-central-1"
}

variable "project" {
  description = "Project name exposed in AWS user tag"
  default = "mina"
}

locals {
  s3-prefix = "${var.project}-fast-zk-rollup"
}

terraform {
  backend "s3" {
    bucket = "mina-tf-state"
    key = "tfstate"
    region = "eu-central-1"
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 5.4"
    }
  }
}

provider "aws" {
  region = "${var.region}"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = {
    project = "${var.project}"
  }
}

# S3 Buckets
#####################
#
# Creating the buckets needed by the EMR cluster to send/receive data,
# and the one containing code and boostrap scripts.

# Stores the EMR incoming data.
resource "aws_s3_bucket" "emr_input" {
  bucket = "${local.s3-prefix}-emr-input"
  tags = {
    project = "${var.project}"
  }
}

# Stores the EMR result data.
resource "aws_s3_bucket" "emr_output" {
  bucket = "${local.s3-prefix}-emr-output"
  tags = {
    project = "${var.project}"
  }
}

# Cleaning the input/output > 2 days objects. This is highly
# transcient data, there's no point in keeping it forever.

resource "aws_s3_bucket_lifecycle_configuration" "emr_input_expiration" {
  bucket = aws_s3_bucket.emr_input.id
  rule {
    id = "expiration"
    status = "Enabled"
    expiration {
      days = 2
    }
    filter { }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "emr_output_expiration" {
  bucket = aws_s3_bucket.emr_output.id
  rule {
    id = "expiration"
    status = "Enabled"
    expiration {
      days = 2
    }
    filter { }
  }
}

# Stores the EMR meta data. It contains the code for the
# mappers/reducers, the bootstrap script, etc.
resource "aws_s3_bucket" "emr_data" {
  bucket = "${local.s3-prefix}-emr-data"
  tags = {
    project = "${var.project}"
  }
}

# TODO: we probably should rather upload those from the CI.
# TODO: create a CI IAM role w/ write access to the emr-data bucket.

resource "aws_s3_object" "emr_bootstrap_script" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "emr_bootstrap_script.sh"
  source = "bootstrap_script"
  etag = filemd5("bootstrap_script")
}

resource "aws_s3_object" "emr_reducer" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "reducer.js"
  source = "../steps/reducer.js"
  etag = filemd5("../steps/reducer.js")
}

resource "aws_s3_object" "emr_mapper" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "mapper.js"
  source = "../steps/mapper.js"
  etag = filemd5("../steps/mapper.js")
}

# Public Subnet Setup
#####################
#
# We're allocating a public IP for each instance living in this
# subnet. The routing table is pretty straightforward: a simple
# non-NATed gateway.

resource "aws_subnet" "public-1" {
  vpc_id = "${aws_vpc.main.id}"
  cidr_block = "10.0.0.0/24"
  map_public_ip_on_launch = "true"
  availability_zone = "${var.region}a"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = "${aws_vpc.main.id}"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = "${aws_vpc.main.id}"
  route {
    cidr_block = "0.0.0.0/0"
    # Public network: we don't NAT through the gateway.
    gateway_id = "${aws_internet_gateway.main.id}"
  }
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table_association" "public-1"{
  subnet_id = "${aws_subnet.public-1.id}"
  route_table_id = "${aws_route_table.public.id}"
}

# Private Subnet Setup
#####################
#
# We're not allocating any public IP to the members of this setup.
# We're NAT-ing the egress through a gateway having a public eip.


resource "aws_subnet" "private-1" {
  vpc_id = "${aws_vpc.main.id}"
  cidr_block = "10.0.1.0/24"
  availability_zone = "${var.region}a"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_eip" "nat_gateway" {
  domain = "vpc"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat_gateway.id
  subnet_id     = "${aws_subnet.public-1.id}"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table" "private-1" {
  vpc_id = "${aws_vpc.main.id}"
  route {
    cidr_block = "0.0.0.0/0"
    # Private network, NAT-ing the egress
    nat_gateway_id = "${aws_nat_gateway.main.id}"
  }
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table_association" "private-1"{
  subnet_id = "${aws_subnet.private-1.id}"
  route_table_id = "${aws_route_table.private-1.id}"
}

# EC2 Security Groups
# IAM Rules
####################

resource "aws_security_group" "sequencer" {
  vpc_id = "${aws_vpc.main.id}"
  egress {
    from_port = 0
    to_port = 0
    protocol = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # TODO: Mina node ingress
  tags = {
    project = "${var.project}"
  }
}

resource "aws_security_group" "emr_master" {
  vpc_id = "${aws_vpc.main.id}"
  egress {
    from_port = 0
    to_port = 0
    protocol = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "emr_core" {
  vpc_id = "${aws_vpc.main.id}"
  egress {
    from_port = 0
    to_port = 0
    protocol = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
    actions = [ "sts:AssumeRole" ]
  }
}

resource "aws_iam_role" "iam_emr_profile_role" {
  name               = "iam_emr_profile_role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_instance_profile" "emr_profile" {
  name = "emr_profile"
  role = aws_iam_role.iam_emr_profile_role.name
}

data "aws_iam_policy_document" "iam_emr_service_policy" {
  statement {
    effect = "Allow"

    actions = [
      "ec2:AuthorizeSecurityGroupEgress",
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:CancelSpotInstanceRequests",
      "ec2:CreateNetworkInterface",
      "ec2:CreateSecurityGroup",
      "ec2:CreateTags",
      "ec2:DeleteNetworkInterface",
      "ec2:DeleteSecurityGroup",
      "ec2:DeleteTags",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeAccountAttributes",
      "ec2:DescribeDhcpOptions",
      "ec2:DescribeInstanceStatus",
      "ec2:DescribeInstances",
      "ec2:DescribeKeyPairs",
      "ec2:DescribeNetworkAcls",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribePrefixLists",
      "ec2:DescribeRouteTables",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSpotInstanceRequests",
      "ec2:DescribeSpotPriceHistory",
      "ec2:DescribeSubnets",
      "ec2:DescribeVpcAttribute",
      "ec2:DescribeVpcEndpoints",
      "ec2:DescribeVpcEndpointServices",
      "ec2:DescribeVpcs",
      "ec2:DetachNetworkInterface",
      "ec2:ModifyImageAttribute",
      "ec2:ModifyInstanceAttribute",
      "ec2:RequestSpotInstances",
      "ec2:RevokeSecurityGroupEgress",
      "ec2:RunInstances",
      "ec2:TerminateInstances",
      "ec2:DeleteVolume",
      "ec2:DescribeVolumeStatus",
      "ec2:DescribeVolumes",
      "ec2:DetachVolume",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListInstanceProfiles",
      "iam:ListRolePolicies",
      "iam:PassRole",
      "s3:CreateBucket",
      "s3:Get*",
      "s3:List*",
    ]

  }
}

resource "aws_iam_role" "iam_emr_service_role" {
  name               = "iam_emr_service_role"
  assume_role_policy = data.aws_iam_policy_document.iam_emr_service_policy.json
}

# EMR
######

resource "aws_emr_cluster" "accumulator" {
  name = "accumulator"
  release_label = "emr-6.11.0"
  applications = [ "Hadoop" ]
  service_role = aws_iam_role.iam_emr_service_role.arn
  ec2_attributes {
    subnet_id                         = aws_subnet.private-1.id
    emr_managed_master_security_group = aws_security_group.emr_master.id
    emr_managed_slave_security_group  = aws_security_group.emr_core.id
    instance_profile                  = aws_iam_instance_profile.emr_profile.arn
  }

  master_instance_group {
    instance_type = "m5a.large"
  }

  core_instance_group {
    instance_count = 1
    instance_type  = "m5a.large"
    # TODO: set up autoscaling policy w/ spot instances.
    ebs_config {
      size                 = "20"
      type                 = "gp2"
      volumes_per_instance = 1
    }
  }

  bootstrap_action {
    path = "s3://elasticmapreduce/bootstrap-actions/run-if"
    name = "runif"
    args = ["instance.isMaster=true", "echo running on master node"]
  }
}
