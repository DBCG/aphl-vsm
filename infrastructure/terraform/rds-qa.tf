resource "random_password" "vsm-cqf-ruler-password-qa" {
  length  = 16
  special = false
}

resource "aws_db_instance" "vsm-cqf-ruler-qa" {
  allocated_storage   = 20
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  db_name             = "vsmcqfruler"
  identifier          = "vsm-cqf-ruler-db-qa"
  username            = "dbadmin"
  password            = random_password.vsm-cqf-ruler-password-qa.result
  publicly_accessible = true #TODO: Should setup private in future version
}


resource "random_password" "vsm-keycloak-password-qa" {
  length  = 16
  special = false
}

resource "aws_db_instance" "vsm-keycloak-qa" {
  allocated_storage   = 20
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  db_name             = "keycloak"
  identifier          = "vsm-keycloak-db-qa"
  username            = "dbadmin"
  password            = random_password.vsm-keycloak-password-qa.result
  publicly_accessible = true #TODO: Should setup private in future version
}
