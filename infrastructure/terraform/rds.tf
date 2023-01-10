resource "random_password" "vsm-cqf-ruler-password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "vsm-cqf-ruler" {
  allocated_storage    = 20
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  db_name              = "vsmcqfruler"
  identifier           = "vsm-cqf-ruler-db"
  username             = "dbadmin"
  password             = random_password.vsm-cqf-ruler-password.result
  publicly_accessible  = true # Should setup private in future version
}
