#!/usr/bin/env bash

DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "This command will stop + delete: \n  - all containers \n  - associated volumes \n"
read -p "Continue? (y/n)?" choice

ALL_CONTAINERS=$(docker ps -a -q)

case "$choice" in 
  y|Y ) docker-compose down \
    && docker volume prune -f \
    && docker rm -f $ALL_CONTAINERS \
    && docker prune -f;;
  n|N ) echo "cancelled";;
  * ) echo "invalid option";;
esac

cd ${DIR}/..

