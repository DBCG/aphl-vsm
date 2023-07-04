#!/usr/bin/env bash
// Need yq precusor to run these commands
// This needs to run within the terraform directory so these commands will function

cqf_ruler_rds_endpoint=$(terraform output -json | jq -r '.rds_vsm_cqf_ruler_endpoint.value')
cqf_ruler_rds_password=$(terraform output -json | jq -r '.cqf-ruler-db-password.value')
cqf_ruler_rds_uri="jdbc:postgresql://${cqf_ruler_rds_endpoint}/vsmcqfruler"

yq '.spec.template.spec.containers[0].env[] |= select(.name == "spring.datasource.url") .value = $cqf_ruler_rds_uri' ../kubernetes/templates/cqf-ruler.yaml > ../kubernetes/templates/cqf-ruler.yaml