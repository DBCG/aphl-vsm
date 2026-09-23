#!/usr/bin/env bash

# Abort on the first failing command.
set -euo pipefail

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

CONDITIONS=${DIR}/../documentation/demo-data/valueset-rckms-condition-codes.json
SEARCHPARAMS=${DIR}/../documentation/demo-data/search-parameters.json
USERRESOURCES=${DIR}/../documentation/demo-data/user-resources.json
ENDPOINTS=${DIR}/../documentation/demo-data/terminology-endpoints.json
IMPORT_DATA="${DIR}/../documentation/demo-data/2024-06-28 eRSD/20240608-eRSD-parameters-request-body-for-import-corrected-compose.json"
# SMALLSPECIFICATION=${DIR}/../documentation/demo-data/small-bundle.json

FHIR_SERVER="${FHIR_SERVER:-http://localhost:8082/fhir}"

HEADERS=("-H" "Content-Type: application/json")

# Conditionally add Authorization header if AUTH_TOKEN is set
if [[ -n "${AUTH_TOKEN:-}" ]]; then
    HEADERS+=("-H" "Authorization: Basic $AUTH_TOKEN")
fi

# `--fail-with-body` makes curl exit non-zero on a 4xx/5xx while still printing
# the OperationOutcome, so a failed load stops the script instead of silently
# leaving the server half-populated.
CURL_OPTS=(--fail-with-body --silent --show-error)

# Make sure user is aware of the FHIR_SERVER being used
# and offer exit if wrong
yesOptions=("y" "Y")
if [ "${CI:-}" != "true" ]; then
  echo "This will expunge and reset all data on this FHIR server: $FHIR_SERVER"
  echo "Continue? (y/n)"
  echo ""
  read selection
  if [[ ! " ${yesOptions[@]} " =~ " ${selection} " ]]; then
    echo ""
    echo "Ok, exiting script without making any changes."
    exit 0
  fi
fi


# POST via curl, capturing the response body rather than logging it.
# On failure the captured body is the OperationOutcome saying what went wrong, so print it before aborting.
post() {
  local body status
  set +e
  body=$(curl "${CURL_OPTS[@]}" "$@")
  status=$?
  set -e
  if [ $status -ne 0 ]; then
    echo "  request failed (curl exit $status): $body" >&2
    return $status
  fi
}

echo "Expunging all data from $FHIR_SERVER"
post --location "$FHIR_SERVER/\$expunge" \
  "${HEADERS[@]}" \
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
for bundle in "${SEARCHPARAMS}" "${CONDITIONS}" "${USERRESOURCES}" "${ENDPOINTS}"; do
  echo "  posting $(basename "$bundle")"
  post -d @"${bundle}" "${HEADERS[@]}" "$FHIR_SERVER"
done

echo "  posting eRSD import"
jq --arg url "$FHIR_SERVER" '(.parameter[] | select(.name == "appAuthoritativeUrl")).valueString = $url' "$IMPORT_DATA" | \
post -d @- --location "${FHIR_SERVER}/\$ersd-v2-import" "${HEADERS[@]}"

echo "All Done"