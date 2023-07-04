variable "region" {
  description = "AWS Deployment region."
  default = "eu-central-1"
}

variable "project" {
  description = "Project name exposed in AWS user tag"
  default = "mina"
}

terraform {
  backend "s3" {
    bucket = "mina-tf-state"
    key = "tfstate-bootstrap"
    region = "eu-central-1"
  }
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 5.4"
    }
  }
}

# Note: the ECR API is only available through us-east-1.
# See: https://github.com/aws/karpenter/issues/3015
provider "aws" {
  region = "us-east-1"
  alias = "virginia"
}

data "aws_ecrpublic_authorization_token" "token" {
  provider = aws.virginia
}

provider "aws" {
  region = "${var.region}"
}

resource "aws_ecrpublic_repository" "zk_rollup" {
  repository_name = "zk-rollup-docker-registry"
  provider = aws.virginia

  catalog_data {
    about_text        = "Fast ZK Rollup Docker Registry"
    architectures     = ["x86-64"]
    operating_systems = ["Linux"]
  }
}

data "aws_iam_user" "registry_user" {
  user_name = "docker-registry-github"
}

resource "aws_iam_user_policy" "registry_access" {
  name = "test"
  user = data.aws_iam_user.registry_user.user_name

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr-public:*",
          "sts:GetServiceBearerToken"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

data "aws_iam_policy_document" "zk_rollup_ecr_policy" {
  statement {
    effect = "Allow"
    principals {
      type = "AWS"
      identifiers = [ "${data.aws_iam_user.registry_user.arn}" ]
    }
    actions = [
      "ecr-public:*",
      "sts:GetServiceBearerToken"
    ]
  }
  statement {
    effect = "Allow"
    principals {
      type = "*"
      identifiers = [ "*" ]
    }
    actions = [
      "ecr-public:GetAuthorizationToken",
      "sts:GetServiceBearerToken",
      "ecr-public:BatchCheckLayerAvailability",
      "ecr-public:GetRepositoryPolicy",
      "ecr-public:DescribeRepositories",
      "ecr-public:DescribeRegistries",
      "ecr-public:DescribeImages",
      "ecr-public:DescribeImageTags",
      "ecr-public:GetRepositoryCatalogData",
      "ecr-public:GetRegistryCatalogData"
    ]
  }
}

resource "aws_ecrpublic_repository_policy" "zk_rollup" {
  provider = aws.virginia
  repository_name = aws_ecrpublic_repository.zk_rollup.repository_name
  policy = data.aws_iam_policy_document.zk_rollup_ecr_policy.json
}
