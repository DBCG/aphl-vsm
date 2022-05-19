#!/usr/bin/env bash
# exit when any command fails
set -e

currentRunningCqfServer=$(docker ps -q --filter ancestor=alphora/cqf-ruler:latest)

# stop container by the full image name
if [[ -n $currentRunningCqfServer ]]
then
  docker stop $(docker ps -q --filter ancestor=alphora/cqf-ruler:latest)
fi
# pull the docker image
docker pull alphora/cqf-ruler
# delete the volume, or else you get stale data
docker volume rm -f cqf-server-vsm-app
# create a new volume
docker volume create cqf-server-vsm-app 2>/dev/null

# run hapi server with attached volume
docker run -d --rm -p 8080:8080 --mount source=cqf-server-vsm-app,target=/usr/local/tomcat/target/database alphora/cqf-ruler:latest