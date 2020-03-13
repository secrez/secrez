#!/usr/bin/env bash

rm -rf node_modules
bin/purge-node-modules.sh
(cd packages && ../bin/purge-node-modules.sh)

