locals {
  name            = "aphl-eks"
  application     = "platform"
  cost_center     = "clinical-intelligence"
  owner           = "clintel-standards"
  project         = "aphl"
  cluster_version = "1.34"
  region          = "us-east-1"

  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Name        = local.name
    Application = local.application
    CostCenter  = local.cost_center
    Owner       = local.owner
    Project     = local.project
  }
}
