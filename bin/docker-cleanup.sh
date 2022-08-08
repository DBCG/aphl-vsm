#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"


KEYCLOAK_DIR=${DIR}/../keycloak

echo -e "This command will stop + delete: \n  - all containers \n  - associated volumes \n  - docker networks\n"
read -p "Continue? (y/n)?" choice


case "$choice" in 
  y|Y ) cd ${KEYCLOAK_DIR} \
    && docker-compose down \
    && docker rm -f $(docker ps -a -q) \
    && docker volume rm $(docker volume ls -q) \
    && docker network prune;;
  n|N ) echo "cancelled";;
  * ) echo "invalid option";;
esac

cd ${DIR}/..

