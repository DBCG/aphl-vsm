#!/usr/bin/env bash
# exit when any command fails
set -e

CONTAINER_NAME="cqf-ruler-vsm"
MATCHING_CONTAINERS=$(docker container ls -a | grep "$CONTAINER_NAME" | wc -l)

# if container does not already exist, make it
if (( $MATCHING_CONTAINERS < 1)); then
  docker run -e "hapi.fhir.server_address=http://localhost:8082/fhir" -e "hapi.fhir.fhir_version=R4" -e "hapi.fhir.cql.cql_logging_enabled=true" -p 8082:8080 --name cqf-ruler-vsm alphora/cqf-ruler:vsm_draft_operation
else
  docker start cqf-ruler-vsm
fi