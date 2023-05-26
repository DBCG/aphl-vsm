#!/usr/bin/env bash

FHIR_SERVER=${1:-http://localhost:8081/fhir}

curl --location "$FHIR_SERVER/\$expunge" \
--header 'Content-Type: application/json' \
--header 'Cookie: _session_id=96c7ac4450f29cfce417b26a0f163267' \
--data '{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "expungeEverything",
      "valueBoolean": true
    }
  ]
}'