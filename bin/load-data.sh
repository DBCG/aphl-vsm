#!/usr/bin/env bash
# this program is used by the post-demo-data.sh program

# $1 (aka, the first arg) is a required argument -- you must provide a file to upload
# this could be one or more files
UPLOAD_FILES=$1

# $2 will default to the a dev HAPI server endpoint if not provided
FHIR_SERVER=${2:-http://localhost:8080/fhir}

# if no args, print a help message and exit

if [[ $1 -eq "" ]]
  then
    echo "***"
    echo "***"
    echo "***"
    echo "    ERROR:"
    echo "      This program requires a file, or files, to be uploaded to a FHIR server."
    echo -e "      Please format your command as follows:\n"
    echo -e "      bin/load-data [required: file or files to upload], [optional: FHIR server endpoint]\n"
    echo "***"
    echo "***"
    echo "***"
    exit 1
fi

for i in $UPLOAD_FILES; do
  echo "Using: ${i}"
  curl -d @${i} --header "Content-Type: application/fhir+json" -v $FHIR_SERVER
done