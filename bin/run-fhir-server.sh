#!/usr/bin/env bash
# exit when any command fails
set -e

# stop container by the full image name
docker stop $(docker ps -q --filter ancestor=hapiproject/hapi:v5.6.0)
# delete the volume, or else you get stale data
docker volume rm -f hapi-dev-vsm-app
# create a new volume
docker volume create hapi-dev-vsm-app 2>/dev/null

# run hapi server with attached volume
docker run -d --rm -p 8080:8080 --mount source=hapi-dev-vsm-app,target=/usr/local/tomcat/target/database hapiproject/hapi:v5.6.0