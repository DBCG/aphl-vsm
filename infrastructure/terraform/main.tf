data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

data "aws_security_group" "eks_default" {
  id = "sg-098826804e2654a54"
}


################################################################################
# EKS Module
################################################################################

module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name                   = local.name
  cluster_version                = local.cluster_version
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  # We are using the IRSA created below for permissions
  # However, we have to deploy with the policy attached FIRST (when creating a fresh cluster)
  # and then turn this off after the cluster/node group is created. Without this initial policy,
  # the VPC CNI fails to assign IPs and nodes cannot join the cluster
  # See https://github.com/aws/containers-roadmap/issues/1666 for more context
  # TODO - remove this policy once AWS releases a managed version similar to AmazonEKS_CNI_Policy (IPv4)
  # create_cni_ipv6_iam_policy = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      addon_version            = "v1.20.5-eksbuild.1"
      service_account_role_arn = module.vpc_cni_irsa.iam_role_arn
      configuration_values = jsonencode({
        env = {
          # Reference docs https://docs.aws.amazon.com/eks/latest/userguide/cni-increase-ip-addresses.html
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
  }

  vpc_id                                = module.vpc.vpc_id
  subnet_ids                            = module.vpc.private_subnets
  control_plane_subnet_ids              = module.vpc.intra_subnets
  cluster_additional_security_group_ids = [data.aws_security_group.eks_default.id]

  create_kms_key = false
  cluster_encryption_config = {
    provider_key_arn = "arn:aws:kms:us-east-1:912275679263:key/9c8ef74b-24fd-4fb3-9e14-788589908d32"
    resources        = ["secrets"]
  }

  manage_aws_auth_configmap = false
  create_aws_auth_configmap = false

  eks_managed_node_group_defaults = {
    ami_type       = "AL2023_x86_64_STANDARD"
    instance_types = ["t3.large"]

    iam_role_attach_cni_policy = true
    use_custom_launch_template = false
  }

  eks_managed_node_groups = {
    blue = {
      name            = "aphl-eks-blue"
      use_name_prefix = false

      subnet_ids = [
        "subnet-045847291edbf8ac4",
        "subnet-09aa2ce46e33c022e",
        "subnet-0ae7058268391a444",
      ]

      min_size     = 2
      max_size     = 2
      desired_size = 2

      capacity_type = "SPOT"
      disk_size     = 20

      labels = {
        "aphl/memory-intensive" = "true"
      }

      create_iam_role = false
      iam_role_arn    = "arn:aws:iam::912275679263:role/blue-eks-ng-20260519"
    }
    green = {
      name            = "aphl-eks-green"
      use_name_prefix = false

      subnet_ids = [
        "subnet-045847291edbf8ac4",
        "subnet-09aa2ce46e33c022e",
        "subnet-0ae7058268391a444",
      ]

      min_size     = 2
      max_size     = 2
      desired_size = 2

      capacity_type = "SPOT"
      disk_size     = 20

      labels = {
        "aphl/memory-intensive" = "true"
      }

      create_iam_role = false
      iam_role_arn    = "arn:aws:iam::912275679263:role/green-eks-ng-20260519"
    }
  }

  tags = local.tags
}

module "ebs_kms_key" {
  source  = "terraform-aws-modules/kms/aws"
  version = "~> 1.1"

  description = "Key to encrypt EKS managed node group volumes"

  # Policy
  key_administrators = [
    data.aws_caller_identity.current.arn
  ]
  key_service_users = [
    # required for the ASG to manage encrypted volumes for nodes
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling",
    # required for the cluster / persistentvolume-controller to create encrypted PVCs
    module.eks.cluster_iam_role_arn,
  ]

  # Aliases
  aliases = ["eks/${local.name}/ebs"]

  tags = local.tags
}

module "key_pair" {
  source  = "terraform-aws-modules/key-pair/aws"
  version = "~> 2.0"

  key_name_prefix    = local.name
  create_private_key = true

  tags = local.tags
}

resource "aws_security_group" "remote_access" {
  name_prefix = "${local.name}-remote-access"
  description = "Allow remote SSH access"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  ingress {
    description     = "Redis/Valkey access from EKS nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = ["sg-039ea86f39de74e5a"] # aphl-eks-node-2022123000402777470000000f (EKS node shared security group)
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.name}-remote" })
}

resource "aws_iam_policy" "node_additional" {
  name        = "${local.name}-additional"
  description = "Node additional policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:Describe*",
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })

  tags = local.tags
}
