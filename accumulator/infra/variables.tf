variable "region" {
  description = "AWS Deployment region."
}

variable "project" {
  description = "Project name exposed in AWS user tag"
}

variable "openssh_public_key" {
  description = "A public ssh key to whitelist on ec2 instance."
}

variable "aws_user" {
  description = "AWS user used to access emr_data bucket and ECR."
}

variable "email" {
  description = "An email to use with Let's encrypt ACME service."
}
