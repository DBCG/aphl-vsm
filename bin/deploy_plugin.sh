#!/usr/bin/env bash

set -e
set -o pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Login to ECR
aws sts get-caller-identity
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Build and push image to ECR
docker tag alphora/cqf-ruler:cqf-ruler-vsm
docker push alphora/cqf-ruler:cqf-ruler-vsm

echo "Deployed ecr plugin!"