locals {
  region             = "eu-central-1"
  project            = "mina"
  aws_user           = "username"
  openssh_public_key = "ssh-rsa AAAAB3..."
  email              = "user@example.com"
  ref                = "main"
}

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# terraform {
#   backend "s3" {
#     bucket = "bucket-for-terraform-states"
#     key    = "hazook-fast-zk-rollup.tfstate"
#     region = local.region
#   }
# }

provider "aws" {
  region = local.region
}

module "Hazook-Fast-Zk-Rollup" {
  #source             = "../."
  source             = "git::git@github.com:MinaFoundation/Hazook-Fast-Zk-Rollup.git/accumulator/infra?ref=${local.ref}"
  region             = local.region
  project            = local.project
  openssh_public_key = local.openssh_public_key
  aws_user           = local.aws_user
  email              = local.email
  ref                = local.ref
}
