#!/usr/bin/env bash
# exit when any command fails
set -e

docker volume create hapi-dev-vsm-app 2>/dev/null

docker run -d --rm -p 8080:8080 --mount source=hapi-dev-vsm-app,target=/usr/local/tomcat/target/database hapiproject/hapi:v5.6.0