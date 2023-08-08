#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "This command will stop + delete: \n  - all containers \n  - associated volumes \n"
read -p "Continue? (y/n)? " choice

ALL_CONTAINERS=$(docker ps -a -q)

case "$choice" in 
  y|Y ) docker-compose down \
    && docker rm -f $ALL_CONTAINERS \
    && docker volume rm -f $(docker volume ls -q) \
    && docker system prune -f;;
  n|N ) echo "cancelled";;
  * ) echo "invalid option";;
esac

cd ${DIR}/..

