resource "aws_security_group_rule" "rds_from_eks_nodes" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = "sg-098826804e2654a54"
  source_security_group_id = "sg-047f5f175885f4a45" # eks-cluster-sg-aphl-eks (EKS cluster security group)
  description              = "PostgreSQL access from EKS nodes"
}

resource "aws_security_group_rule" "rds_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = "sg-098826804e2654a54"
  description       = "Allow all outbound traffic"
}

resource "random_password" "sdh-dev-db-01-password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "sdh-dev-db-01" {
  identifier        = "sdh-dev-db-01"
  engine            = "postgres"
  engine_version    = "18.3"
  instance_class    = "db.t4g.small"
  username          = "postgres"
  password          = random_password.sdh-dev-db-01-password.result

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = "arn:aws:kms:us-east-1:912275679263:key/09a407aa-605e-4c76-b693-dd93cc98d6e2"

  db_subnet_group_name   = "default-vpc-03e4b5b883becff02"
  vpc_security_group_ids = ["sg-098826804e2654a54"]
  publicly_accessible    = false

  backup_retention_period = 7
  backup_window           = "06:57-07:27"
  maintenance_window      = "mon:09:58-mon:10:28"
  copy_tags_to_snapshot   = true

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = "arn:aws:kms:us-east-1:912275679263:key/09a407aa-605e-4c76-b693-dd93cc98d6e2"

  auto_minor_version_upgrade = true
  ca_cert_identifier         = "rds-ca-rsa2048-g1"

  deletion_protection = true
  skip_final_snapshot = true

  tags = local.tags

  lifecycle {
    ignore_changes = [password]
  }
}
