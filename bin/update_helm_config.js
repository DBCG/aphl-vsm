#!/usr/bin/env bash
// Need yq precusor to run these commands
// This needs to run within the terraform directory so these commands will function
terraform_output=$(terraform output -json)
cqf_ruler_rds_endpoint=$(jq -r '.rds_vsm_cqf_ruler_endpoint.value' <<< $terraform_output)
cqf_ruler_rds_password=$(jq -r '.cqf_ruler_db_password.value' <<< $terraform_output)

cqf_ruler_rds_uri="jdbc:postgresql://${cqf_ruler_rds_endpoint}/vsmcqfruler" \
yq -i 'select(document_index == 1).spec.template.spec.containers[0].env[] |= select(.name == "spring.datasource.url").value = env(cqf_ruler_rds_uri)' ./cqf-ruler.yaml

keycloak_rds_endpoint=$(jq -r '.rds_keycloak_endpoint.value' <<< $terraform_output)
keycloak_rds_password=$(jq -r '.keycloak_db_password.value' <<< $terraform_output)


elasticache_endpoint=$(jq -r '.redis-cache-endpoint.value' <<< $terraform_output)