#!/usr/bin/env bash

set -e
set -o pipefail

GIT_TAG=$(git tag -l --contains HEAD 2>&1)

cd $TRAVIS_BUILD_DIR/ecr
mvn install -U -DskipTests=true -Dmaven.javadoc.skip=true -T 4 -B -V
docker buildx create --use
# Deploy to AWS
aws sts get-caller-identity
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
docker buildx build --platform linux/arm64/v8,linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cqf-ruler:$TRAVIS_COMMIT --push .

if [[ -n "$GIT_TAG" ]]; then
  echo "Begin CQF Ruler image Push to Ruvos ECR"
  export AWS_ACCESS_KEY_ID=${PROD_AWS_ACCESS_KEY_ID}
  export AWS_SECRET_ACCESS_KEY=${PROD_AWS_SECRET_ACCESS_KEY}
  aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${PROD_AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
  docker buildx build --platform linux/arm64/v8,linux/amd64 -t ${PROD_AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ecr-sandbox-app:${TAG}-cqf --push .
  echo "CQF Ruler Image Pushed Succesfully"
fi

# Deploy to Docker Hub
docker login --username ${DOCKER_USERNAME} --password-stdin <<< $DOCKER_PASSWORD
docker buildx build --platform linux/arm64,linux/amd64 -t alphora/cqf-ruler:cqf-ruler-vsm-ecr --push .

