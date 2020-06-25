#!/usr/bin/env bash

function get_coverage() {
  echo "Generating coverage report for $2"
  (cd packages/$1 && npm test >coverage.report)
  node bin/insert-coverage.js $1
}

get_coverage core @secrez/core
get_coverage fs @secrez/fs
get_coverage secrez secrez

cp packages/secrez/README.md .
