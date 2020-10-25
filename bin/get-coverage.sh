#!/usr/bin/env bash

echo "Generating coverage report for $2"
(cd packages/$1 && pnpm test >coverage.report)
node bin/insert-coverage.js $1
if [[ "$1" == "secrez" ]]; then
  cp packages/secrez/README.md .
fi
echo "Done"
