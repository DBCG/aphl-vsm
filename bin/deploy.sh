#!/usr/bin/env bash

# This script conducts the following
# Deployment of VSM to the APHL Staging and QA environments
# Additionally, if this commit is tagged, it will push the same docker image to the Ruvos ECR Repo

set -e
set -o pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GIT_TAG=$(git tag -l --contains HEAD 2>&1)

PACKAGE_VERSION=$(jq -r '.version' ./vsm-app/package.json)

# Ruvos Build Initiated if GIT_TAG is present
if [[ -v GIT_TAG && -n "$GIT_TAG" ]]; then
# Check if GIT_TAG matches the package version
  if [ "$GIT_TAG" == "$PACKAGE_VERSION" ]; then
      echo "GIT_TAG matches the version in package.json!"
  else
      echo "Mismatch: GIT_TAG is '$GIT_TAG', but package.json version is '$PACKAGE_VERSION'."
      exit 1
  fi
fi

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

namespaces=("vsm")

for namespace in "${namespaces[@]}"; do
  echo "Processing for namespace: $namespace"
  # Create namespace
  if ! kubectl get namespaces | grep $namespace ; then
    kubectl create namespace $namespace
  fi
  values_file=$([[ "$namespace" == "vsm" ]] && echo "$k8s_dir/values.dev.yaml")

  if helm list -n $namespace | grep -q "$helm_chart_name"; then
    echo "Upgrading old stack ${helm_chart_name}"
    helm upgrade "$helm_chart_name" --namespace=$namespace --set tag=$TAG $k8s_dir -f $values_file
  else
    echo "Installing new stack ${helm_chart_name}"
    helm install "$helm_chart_name" --namespace=$namespace --set tag=$TAG $k8s_dir -f $values_file
  fi
done

if [[ -n "$GIT_TAG" ]]; then
  echo "Begin VSM image Push to Ruvos ECR"
  export AWS_ACCESS_KEY_ID=${PROD_AWS_ACCESS_KEY_ID}
  export AWS_SECRET_ACCESS_KEY=${PROD_AWS_SECRET_ACCESS_KEY}
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${PROD_AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
  docker push ${PROD_AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ecr-sandbox-app:${TAG}-vsm
  echo "VSM Image Pushed Succesfully"
fi

echo "Deployed!"

