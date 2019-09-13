#!/usr/bin/env bash

rm -rf node_modules
scripts/purge-node-modules.sh
(cd packages && ../scripts/purge-node-modules.sh)

