resource "random_password" "vsm-cqf-ruler-password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "vsm-cqf-ruler" {
  allocated_storage   = 20
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  db_name             = "vsmcqfruler"
  identifier          = "vsm-cqf-ruler-db"
  username            = "dbadmin"
  password            = random_password.vsm-cqf-ruler-password.result
  publicly_accessible = true #TODO: Should setup private in future version
}


resource "random_password" "vsm-keycloak-password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "vsm-keycloak" {
  allocated_storage   = 20
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  db_name             = "keycloak"
  identifier          = "vsm-keycloak-db"
  username            = "dbadmin"
  password            = random_password.vsm-keycloak-password.result
  publicly_accessible = true #TODO: Should setup private in future version
}
