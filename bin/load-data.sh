#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

DATA=${DIR}/../documentation/demo-data/ersdv2bundle1-1-bundle-trimmed.json

# $2 will default to the a dev HAPI server endpoint if not provided
FHIR_SERVER=${2:-http://localhost:8082/fhir}

# if no args, print a help message and exit
  curl -d @${DATA} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER