locals {
  s3-prefix = "${var.project}-fast-zk-rollup"
  sequencer-nixos-config-values = {
    openssh_public_key                = var.openssh_public_key,
    public_dns                        = aws_eip.sequencer-eip.public_dns,
    bucket_prefix                     = local.s3-prefix,
    region                            = var.region
    email                             = var.email
    additional_master_security_groups = aws_security_group.emr_master.id
    additional_slave_security_groups  = aws_security_group.emr_core.id
    ec2_subnet_ids = [
      aws_subnet.private_1.id
    ]
    zk-rollup-ecr = aws_ecrpublic_repository.zk_rollup.repository_uri
  }

  sequencer-nixos-config = templatefile(
    "${path.module}/templates/sequencer-nixos-config.nix.tftpl",
    local.sequencer-nixos-config-values
  )
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.32"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_iam_user" "zk_rollup" {
  user_name = var.aws_user
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    project = "${var.project}"
  }
}

# Public Subnet Setup
#####################
#
# We're allocating a public IP for each instance living in this
# subnet. The routing table is pretty straightforward: a simple
# non-NATed gateway.

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  map_public_ip_on_launch = "true"
  availability_zone       = "${var.region}b"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    # Public network: we don't NAT through the gateway.
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table_association" "public-1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

# Private Subnet Setup
#####################
#
# We're not allocating any public IP to the members of this setup.
# We're NAT-ing the egress through a gateway having a public eip.


resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.region}b"
  tags = {
    project = "${var.project}"
  }
}

## TODO: add more private subnets in a different availability zones, and also add them locals.ec2_subnet_ids

resource "aws_eip" "nat_gateway" {
  domain = "vpc"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat_gateway.id
  subnet_id     = aws_subnet.public_1.id
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table" "private_1" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    # Private network, NAT-ing the egress
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = {
    project = "${var.project}"
  }
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private_1.id
}

# EC2 Security Groups
# IAM Rules
####################

resource "aws_security_group" "sequencer" {
  vpc_id = aws_vpc.main.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # TODO: Mina node ingress
  tags = {
    project = "${var.project}"
  }
}

resource "aws_security_group" "emr_master" {
  vpc_id = aws_vpc.main.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "emr_core" {
  vpc_id = aws_vpc.main.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Sequencer EC2 Setup
#####################

data "aws_iam_policy_document" "sequencer_assume_role_policy" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
    actions = [
      "sts:AssumeRole",
    ]
  }
}

data "aws_iam_policy_document" "sequencer_role_policy" {
  statement {
    effect = "Allow"
    actions = [
      "s3:*",
    ]
    resources = [
      aws_s3_bucket.emr_input.arn,
      aws_s3_bucket.emr_output.arn,
      "${aws_s3_bucket.emr_input.arn}/*",
      "${aws_s3_bucket.emr_output.arn}/*"
    ]
  }
  statement {
    effect = "Allow"
    actions = [
      "elasticmapreduce:AddJobFlowSteps",
      "elasticmapreduce:AddTags",
      "elasticmapreduce:CancelStep",
      "elasticmapreduce:Describe*",
      "elasticmapreduce:Get*",
      "elasticmapreduce:List*",
      "elasticmapreduce:RunJobFlow",
      "elasticmapreduce:ModifyInstanceFleet",
      "elasticmapreduce:TerminateJobFlows",
      "ec2:Describe*"
    ]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = [
      "iam:PassRole"
    ]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = [
      "iam:CreateServiceLinkedRole",
      "iam:PutRolePolicy"
    ]
    resources = ["arn:aws:iam::*:role/aws-service-role/elasticmapreduce.amazonaws.com*/AWSServiceRoleForEMRCleanup*"]
    condition {
      test     = "ForAnyValue:StringLike"
      variable = "iam:AWSServiceName"
      values   = ["elasticmapreduce.amazonaws.com", "elasticmapreduce.amazonaws.com.cn"]
    }
  }
  statement {
    effect    = "Allow"
    resources = ["arn:aws:iam::*:role/EMR_DefaultRole_V2", ]
    actions   = ["iam:PassRole"]
    condition {
      test     = "ForAnyValue:StringLike"
      variable = "iam:PassedToService"
      values   = ["elasticmapreduce.amazonaws.com*"]
    }
  }
}

resource "aws_iam_policy" "sequencer_policy" {
  name   = "sequencer-policy"
  policy = data.aws_iam_policy_document.sequencer_role_policy.json
}

resource "aws_iam_role" "sequencer_role" {
  name                = "sequencer-role"
  path                = "/"
  assume_role_policy  = data.aws_iam_policy_document.sequencer_assume_role_policy.json
  managed_policy_arns = [aws_iam_policy.sequencer_policy.arn]
}

resource "aws_iam_instance_profile" "sequencer_emr_profile" {
  name = "sequencer_emr_profile"
  role = aws_iam_role.sequencer_role.name
}

resource "aws_eip" "sequencer-eip" {
  domain = "vpc"
  tags = {
    project = "${var.project}"
  }
}

resource "aws_eip_association" "sequencer-eip" {
  instance_id          = aws_instance.sequencer.id
  allocation_id        = aws_eip.sequencer-eip.id
  network_interface_id = aws_network_interface.pub-sequencer.id
}

resource "aws_key_pair" "sequencer" {
  key_name   = "sequencer"
  public_key = var.openssh_public_key
}

resource "aws_network_interface" "priv-sequencer" {
  subnet_id = aws_subnet.private_1.id
  attachment {
    instance     = aws_instance.sequencer.id
    device_index = 2
  }
}
resource "aws_network_interface" "pub-sequencer" {
  subnet_id       = aws_subnet.public_1.id
  security_groups = [aws_security_group.sequencer.id]
}

resource "aws_instance" "sequencer" {
  ami                  = "ami-0749963dd978a57c7" # us-west-2 NixOS 23.05.426.afc48694f2a
  key_name             = aws_key_pair.sequencer.id
  instance_type        = "m5a.large"
  user_data            = local.sequencer-nixos-config
  iam_instance_profile = aws_iam_instance_profile.sequencer_emr_profile.name

  network_interface {
    network_interface_id = aws_network_interface.pub-sequencer.id
    device_index         = 0
  }
  root_block_device {
    volume_size = 15
  }
  tags = {
    project = "${var.project}"
    Name    = "${var.project}-sequencer"
  }
  depends_on = [aws_eip.sequencer-eip]
}
