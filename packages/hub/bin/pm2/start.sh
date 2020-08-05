#!/usr/bin/env bash

PWD="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
PM2=`which pm2`

if [[ "$PM2" == "" ]]; then
  npm i -g pm2
fi

#
# If old, deleted processes show up despite "pm2 delete ..." clear them definitely running:
#
#   pm2 cleardump
#

#pm2 update

pm2 start $PWD/secrez-hub-config.js
pm2 save

pm2 logs
