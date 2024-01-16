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

resource "aws_iam_role_policy_attachment" "iam_emr_mapreduce" {
  role       = aws_iam_role.iam_emr_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole"
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
