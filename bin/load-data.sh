#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

SPECIFICATION=${DIR}/../documentation/demo-data/ersdv2-active-specification-bundle-trimmed.json
CONDITIONS=${DIR}/../documentation/demo-data/valueset-rckms-condition-codes.json
 
# $2 will default to the a dev HAPI server endpoint if not provided
FHIR_SERVER=${2:-http://localhost:8082/fhir}

# if no args, print a help message and exit
curl -d @${SPECIFICATION} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER
curl -d @${CONDITIONS} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER