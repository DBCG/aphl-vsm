#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

SPECIFICATION=${DIR}/../documentation/demo-data/updated-transaction-bundle.json
CONDITIONS=${DIR}/../documentation/demo-data/valueset-rckms-condition-codes.json
SEARCHPARAMS=${DIR}/../documentation/demo-data/search-parameters.json
USERRESOURCES=${DIR}/../documentation/demo-data/user-resources.json
 
# $2 will default to the a dev HAPI server endpoint if not provided
FHIR_SERVER=${2:-http://localhost:8082/fhir}

echo "Expunging all data from $FHIR_SERVER"
curl --location "$FHIR_SERVER/\$expunge" \
--header 'Content-Type: application/json' \
--data '{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "expungeEverything",
      "valueBoolean": true
    }
  ]
}'

echo "Loading data into $FHIR_SERVER"
# if no args, print a help message and exit
curl -d @${SEARCHPARAMS} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER
curl -d @${SPECIFICATION} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER
curl -d @${CONDITIONS} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER
curl -d @${USERRESOURCES} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER

echo "All Done"