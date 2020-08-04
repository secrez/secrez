#!/usr/bin/env bash

PACKAGES=`ls -d packages/*`
for package in $PACKAGES
do
   (cd $package && echo $package && npm-check-unused)
done
