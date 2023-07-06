#!/usr/bin/env bash
# Need yq precusor to run these commands

cd ./infrastructure/terraform

terraform_output=$(terraform output -json)
cqf_ruler_rds_endpoint=$(jq -r '.rds_vsm_cqf_ruler_endpoint.value' <<< $terraform_output)


cqf_ruler_rds_uri="jdbc:postgresql://${cqf_ruler_rds_endpoint}/vsmcqfruler" \
yq -i '.cqf_ruler_db_url = env(cqf_ruler_rds_uri)' ../kubernetes/values.yaml
# yq -i 'select(document_index == 1).spec.template.spec.containers[0].env[] |= select(.name == "spring.datasource.url").value = env(cqf_ruler_rds_uri)' ./cqf-ruler.yaml

vsm_app_url=$(kube get svc -n vsm -o json | jq -r '.items[] | select(.metadata.name == "vsm-app").status.loadBalancer.ingress[0].hostname') \ 
yq -i '.vsm_app_url = env(vsm_app_url)' ../kubernetes/values.yaml

keycloak_app_url=$(kube get svc -n vsm -o json | jq -r '.items[] | select(.metadata.name == "keycloak").status.loadBalancer.ingress[0].hostname') \ 
yq -i '.keycloak_app_url = env(keycloak_app_url)' ../kubernetes/values.yaml

keycloak_rds_endpoint=$(jq -r '.rds_keycloak_endpoint.value' <<< $terraform_output) \
yq -i '.keycloak_db_url = env(keycloak_rds_endpoint)' ../kubernetes/values.yaml

elasticache_endpoint=$(jq -r '.redis_cache_endpoint.value' <<< $terraform_output) \
yq -i '.redis_host_url = env(elasticache_endpoint)' ../kubernetes/values.yaml

# Set secrets for dbs
# keycloak_rds_password=$(jq -r '.keycloak_db_password.value' <<< $terraform_output)
# cqf_ruler_rds_password=$(jq -r '.cqf_ruler_db_password.value' <<< $terraform_output)