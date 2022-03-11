#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# adds all resources in the demo-data folder as arguments to the load-data program
# by default, this will POST to the HAPI dev :8080/fhir endpoint
${DIR}/load-data.sh ${DIR}/../../documentation/demo-data/\*