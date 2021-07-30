#!/usr/bin/env bash

CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGES=`ls -d packages/*`
for package in $PACKAGES
do
   (cd $package && printf "
$CYAN===================================================
$BLUE$package$NC

" && $@
)
done
