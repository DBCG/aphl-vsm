#!/usr/bin/env bash

set -e
set -o pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Login to ECR
aws sts get-caller-identity
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Build and push image to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/vsm-app:${TAG}

# Setup kubectl context
aws eks update-kubeconfig --region us-east-1 --name aphl-eks
kube_cluster=$(aws eks describe-cluster --name aphl-eks --region us-east-1 --output=json | jq ".cluster.arn" | tr -d '"')
kubectl config use-context "$kube_cluster"

helm version
helm_chart_name="vsm-app"
k8s_dir="${DIR}/../infrastructure/kubernetes"
aws --version

namespaces=("vsm" "vsm-qa")

for namespace in "${namespaces[@]}"; do
  echo "Processing for namespace: $namespace"
  # Create namespace
  if ! kubectl get namespaces | grep $namespace ; then
    kubectl create namespace $namespace
  fi
  values_file=$([[ "$namespace" == "vsm" ]] && echo "$k8s_dir/values.yaml" || echo "$k8s_dir/values.qa.yaml")

  if helm list -n $namespace | grep -q "$helm_chart_name"; then
    echo "Upgrading old stack ${helm_chart_name}"
    helm upgrade "$helm_chart_name" --namespace=$namespace --set tag=$TAG $k8s_dir -f $values_file
  else
    echo "Installing new stack ${helm_chart_name}"
    helm install "$helm_chart_name" --namespace=$namespace --set tag=$TAG $k8s_dir -f $values_file
  fi
done

echo "Deployed!"