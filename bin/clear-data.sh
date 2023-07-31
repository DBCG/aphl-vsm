#!/usr/bin/env bash
# Used to clear data from fhir server for testing purposes
# Usage: ./clear-data.sh [FHIR_SERVER]
#

FHIR_SERVER=${1:-http://localhost:8081/fhir}

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