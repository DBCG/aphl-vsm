#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

CONDITIONS=${DIR}/../documentation/demo-data/valueset-rckms-condition-codes.json
SEARCHPARAMS=${DIR}/../documentation/demo-data/search-parameters.json
USERRESOURCES=${DIR}/../documentation/demo-data/user-resources.json
ENDPOINTS=${DIR}/../documentation/demo-data/terminology-endpoints.json
IMPORT_DATA=${DIR}/../documentation/demo-data/uat-seed-import-params.json
SEED_PROGRAMS=${DIR}/../documentation/demo-data/uat-seed-programs.json

FHIR_SERVER="${FHIR_SERVER:-http://localhost:8082/fhir}"

HEADERS=("-H" "Content-Type: application/json")

# Conditionally add Authorization header if AUTH_TOKEN is set
if [[ -n "$AUTH_TOKEN" ]]; then
    HEADERS+=("-H" "Authorization: Basic $AUTH_TOKEN")
fi

# Make sure user is aware of the FHIR_SERVER being used
# and offer exit if wrong
yesOptions=("y" "Y")
noOptions=("n" "N")
if [ "$CI" != "true" ]; then
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

echo "Expunging all data from $FHIR_SERVER"
curl --location "$FHIR_SERVER/\$expunge" \
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
# if no args, print a help message and exit
curl -d @${SEARCHPARAMS} "${HEADERS[@]}" -v $FHIR_SERVER
curl -d @${CONDITIONS} "${HEADERS[@]}" -v $FHIR_SERVER
curl -d @${USERRESOURCES} "${HEADERS[@]}" -v $FHIR_SERVER
curl -d @${ENDPOINTS} "${HEADERS[@]}" -v $FHIR_SERVER

jq --arg url "$FHIR_SERVER" '(.parameter[] | select(.name == "appAuthoritativeUrl")).valueString = $url' "$IMPORT_DATA" | \
curl -d @- --location ${FHIR_SERVER}/\$ersd-v2-import "${HEADERS[@]}"

curl -d @${SEED_PROGRAMS} "${HEADERS[@]}" -v $FHIR_SERVER

echo ""
echo "----------"
echo "All Done"
echo "----------"
