#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"


KEYCLOAK_DIR=${DIR}/../keycloak

echo -e "This command will stop + delete: \n  - all containers \n  - associated volumes \n  - docker networks\n"
read -p "Continue? (y/n)?" choice

ALL_CONTAINERS=$(docker ps -a -q)

case "$choice" in 
  y|Y ) cd ${KEYCLOAK_DIR} \
    && docker-compose down \
    && docker rm -f $ALL_CONTAINERS \
    && docker volume prune \
    && docker network prune;;
  n|N ) echo "cancelled";;
  * ) echo "invalid option";;
esac

cd ${DIR}/..

