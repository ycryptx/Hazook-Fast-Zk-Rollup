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

resource "aws_iam_user_policy" "zk_rollup_data_bucket" {
  name = "zk-rollup-data-bucket"
  user = data.aws_iam_user.zk_rollup.user_name

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
