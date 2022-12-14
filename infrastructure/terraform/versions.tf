terraform {
  required_version = ">= 1.0"

  backend "s3" {
    region = "us-east-1"
    bucket = "aphl-vsm-terraform-state"
    key    = "aphl-vsm.tfstate"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.47"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.10"
    }
  }
}
