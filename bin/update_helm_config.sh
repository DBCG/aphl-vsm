#!/usr/bin/env bash
# Updates the values file for helm with the terraform output
# and the load balancer urls

cd ./infrastructure/terraform

echo "Updating helm config with terraform output"

terraform_output=$(terraform output -json)
cqf_ruler_rds_endpoint=$(jq -r '.rds_vsm_cqf_ruler_endpoint.value' <<< $terraform_output)

cqf_ruler_rds_uri="jdbc:postgresql://${cqf_ruler_rds_endpoint}/vsmcqfruler" \
yq -i '.cqf_ruler.db_url = env(cqf_ruler_rds_uri)' ../kubernetes/values.yaml
# yq -i 'select(document_index == 1).spec.template.spec.containers[0].env[] |= select(.name == "spring.datasource.url").value = env(cqf_ruler_rds_uri)' ./hapi-fhir-jpa-server-starter.yaml

keycloak_rds_endpoint=$(jq -r '.rds_vsm_keycloak_endpoint.value' <<< $terraform_output)

keycloak_rds_uri="jdbc:postgresql://${keycloak_rds_endpoint}/keycloak" \
yq -i '.keycloak.db_url = env(keycloak_rds_uri)' ../kubernetes/values.yaml

elasticache_endpoint=$(jq -r '.redis_cache_endpoint.value' <<< $terraform_output) \
yq -i '.vsm_app.redis_host_url = env(elasticache_endpoint)' ../kubernetes/values.yaml
echo "done!"

echo "Updating helm config with load balancer urls"
kube_output=$(kubectl get svc -n vsm -o json)

vsm_app_url=$(jq -r '.items[] | select(.metadata.name == "vsm-app").status.loadBalancer.ingress[0].hostname' <<< $kube_output) \
yq -i '.vsm_app.app_url = env(vsm_app_url)' ../kubernetes/values.yaml

keycloak_app_url=$(jq -r '.items[] | select(.metadata.name == "keycloak").status.loadBalancer.ingress[0].hostname' <<< $kube_output) \
yq -i '.keycloak.app_url = env(keycloak_app_url)' ../kubernetes/values.yaml
echo "done!"

# Set secrets for dbs, example below: 
# keycloak_rds_password=$(jq -r '.keycloak_db_password.value' <<< $terraform_output)
# cqf_ruler_rds_password=$(jq -r '.cqf_ruler_db_password.value' <<< $terraform_output)

# kubectl create secret generic prod-db-passwords  -n vsm --from-literal=vsm-db-password=$cqf_ruler_rds_password --from-literal=keycloak_db_password=$keycloak_rds_password
