variable "kms_key_administrators" {
  description = "Additional IAM ARNs granted KMS key administrator access (required to run Terraform against the EBS key)"
  type        = list(string)
  default = [
    "arn:aws:iam::912275679263:user/jonathanpercival",
    "arn:aws:iam::912275679263:user/chris.oriordan",
  ]
}
