#!/usr/bin/env bash

set -e
set -o pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Login to docker hub
docker login --username ${DOCKER_USERNAME} --password-stdin <<< ${DOCKER_PASSWORD}

# Build and push ruler image to docker hub
docker tag cqf-ruler:$TRAVIS_COMMIT alphora/cqf-ruler:cqf-ruler-vsm-ecr
docker push alphora/cqf-ruler:cqf-ruler-vsm-ecr

echo "Deployed with plugin to dockerhub!"