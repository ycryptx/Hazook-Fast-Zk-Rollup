variable "region" {
  description = "AWS Deployment region."
}

variable "project" {
  description = "Project name exposed in AWS user tag"
}

variable "openssh_public_key" {
  description = "Public key to ssh to ec2 instance."
}

variable "aws_user" {
  description = "AWS user that will get access to emr_data bucket"
}

variable "email" {
  description = "An email to use with Let's encrypt ACME service"
}

variable "ref" {
  description = "Terraform branch/tag"
}

locals {
  s3-prefix = "${var.project}-fast-zk-rollup"

  sequencer-nixos-config-values = {
    ycryptx_public_key = var.openssh_public_key,
    public_dns         = aws_eip.sequencer-eip.public_dns,
    bucket-prefix      = local.s3-prefix,
    region             = var.region
    email              = var.email
  }

  sequencer-nixos-config = templatefile(
    "${path.module}/templates/sequencer-nixos-config.nix.tftpl",
    local.sequencer-nixos-config-values
  )
}

provider "aws" {
  region = var.region
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
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
    id     = "expiration"
    status = "Enabled"
    expiration {
      days = 2
    }
    filter {}
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "emr_output_expiration" {
  bucket = aws_s3_bucket.emr_output.id
  rule {
    id     = "expiration"
    status = "Enabled"
    expiration {
      days = 2
    }
    filter {}
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

data "aws_iam_user" "ci_user" {
  user_name = var.aws_user
}

resource "aws_iam_user_policy" "ci_user_data_bucket" {
  name = "ci-user-data-bucket"
  user = data.aws_iam_user.ci_user.user_name

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:ListBucket",
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.emr_data.arn
        ]
      },
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.emr_data.arn}/*"
        ]
      },
    ]
  })
}

# TODO: we probably should rather upload those from the CI.
# TODO: create a CI IAM role w/ write access to the emr-data bucket.

resource "aws_s3_object" "emr_bootstrap_script" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "emr_bootstrap_script.sh"
  source = "${path.module}/emr_bootstrap_script.sh"
  etag   = filemd5("${path.module}/emr_bootstrap_script.sh")
}

resource "aws_s3_object" "emr_reducer" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "reducer.js"
  source = "./scripts/reducer.js"
  etag   = filemd5("./scripts/reducer.js")
}

resource "aws_s3_object" "emr_mapper" {
  bucket = aws_s3_bucket.emr_data.id
  key    = "mapper.js"
  source = "./scripts/mapper.js"
  etag   = filemd5("./scripts/mapper.js")
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

# EMR
######
data "aws_iam_policy_document" "ec2_bucket_access" {
  statement {
    effect = "Allow"

    actions = [
      "s3:AbortMultipartUpload",
      "s3:DeleteObject",
      "s3:GetBucketVersioning",
      "s3:GetObject",
      "s3:GetObjectTagging",
      "s3:GetObjectVersion",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:ListBucketVersions",
      "s3:ListMultipartUploadParts",
      "s3:PutBucketVersioning",
      "s3:PutObject",
      "s3:PutObjectTagging"
    ]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "ec2_assume_role" {
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

resource "aws_iam_role" "iam_emr_ec2" {
  name               = "iam_emr_ec2_role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy" "iam_emr_ec2" {
  name   = "iam-emr-ec2"
  role   = aws_iam_role.iam_emr_ec2.name
  policy = data.aws_iam_policy_document.ec2_bucket_access.json
}

resource "aws_iam_instance_profile" "emr_ec2" {
  name = "emr-ec2-profile"
  role = aws_iam_role.iam_emr_ec2.name
}

// TODO: figure out if we want to add EMR provisioning from terraform,
// as currently it is being done via-code by the sequencer. Also, note that
// the configuration below is different: it uses instance groups, not instance fleets,
// no instance type diversity, etc.
# resource "aws_emr_cluster" "accumulator" {
#   name          = "accumulator"
#   release_label = "emr-6.11.0"
#   applications  = ["Hadoop"]
#   service_role  = "EMR_DefaultRole"
#   ec2_attributes {
#     additional_master_security_groups = aws_security_group.emr_master.id
#     additional_slave_security_groups  = aws_security_group.emr_core.id
#     instance_profile                  = aws_iam_instance_profile.emr_ec2.name
#     key_name = aws_key_pair.ycryptx.key_name
#   }

#   log_uri = "s3://${aws_s3_bucket.emr_data.id}"

#   master_instance_group {
#     instance_count = 1
#     instance_type  = "m5a.2xlarge"
#     # The spot market for this instance has been stable and under .15 for
#     # the last 6 months. On demand is at 0.23, we save more than 50% of the bill.
#     # Note: we probably want a non-spot master node in production.
#     bid_price = 0.5
#   }

#   core_instance_group {
#     instance_count = 1
#     instance_type  = "m5a.2xlarge"
#     # The spot market for this instance has been stable and under .15 for
#     # the last 6 months. On demand is at 0.23, we save more than 50% of the bill.
#     bid_price = 0.5
#   }

#   bootstrap_action {
#     path = "s3://${aws_s3_bucket.emr_data.id}/emr_bootstrap_script.sh"
#     name = "emr_bootstrap_script.semr_bootstrap_script.sh"
#   }

#   tags = {
#     for-use-with-amazon-emr-managed-policies = true
#     project                                  = "mina"
#   }
# }


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

resource "aws_key_pair" "ycryptx" {
  key_name   = "ycryptx"
  public_key = var.openssh_public_key
}

resource "aws_key_pair" "sequencer" {
  key_name   = "sequencer"
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ6tWZZkHYJJtD7G+hiOc8ICbNrDngrLtE/jst67wERX"
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
  ami      = "ami-0749963dd978a57c7" # us-west-2 NixOS 23.05.426.afc48694f2a
  key_name = aws_key_pair.ycryptx.id
  #subnet_id              = aws_subnet.public_1.id
  instance_type        = "m5a.large"
  user_data            = local.sequencer-nixos-config
  iam_instance_profile = aws_iam_instance_profile.sequencer_emr_profile.name
  #vpc_security_group_ids = [aws_security_group.sequencer.id]

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

output "public_dns" {
  value = aws_instance.sequencer.public_dns
}

