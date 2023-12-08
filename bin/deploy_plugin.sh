#!/usr/bin/env bash

set -e
set -o pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Login to ECR
aws sts get-caller-identity
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Build and push ruler image to ECR
docker tag cqf-ruler:$TRAVIS_COMMIT ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cqf-ruler:${TRAVIS_COMMIT}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cqf-ruler:${TRAVIS_COMMIT}

echo "Deployed ecr plugin!"