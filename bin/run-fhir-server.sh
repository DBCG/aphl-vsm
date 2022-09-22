#!/usr/bin/env bash
# exit when any command fails
set -e

docker run -e "hapi.fhir.server_address=http://localhost:8082/fhir" -e "hapi.fhir.fhir_version=R4" -e "hapi_fhir_cql_cql_logging_enabled=true" -p 8082:8080 --name cqf-ruler-vsm alphora/cqf-ruler:vsm_newversionop



# Pasted below are the commands for running the latest CQF server from Alphora
# this is currently replaced by another docker image that adds the $draft functionality we need for program cloning

# # stop container by the full image name
# if [[ -n $currentRunningCqfServer ]]
# then
#   docker stop $(docker ps -q --filter ancestor=alphora/cqf-ruler:latest)
# fi
# # pull the docker image
# docker pull alphora/cqf-ruler
# # delete the volume, or else you get stale data
# docker volume rm -f cqf-server-vsm-app
# # create a new volume
# docker volume create cqf-server-vsm-app 2>/dev/null

# # run hapi server with attached volume
# docker run -d --rm -p 8081:8080 --platform linux/amd64 --mount source=cqf-server-vsm-app,target=/usr/local/tomcat/target/database alphora/cqf-ruler:latest