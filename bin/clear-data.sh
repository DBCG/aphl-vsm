#!/usr/bin/env bash

curl --location 'http://localhost:8082/fhir/$expunge' \
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