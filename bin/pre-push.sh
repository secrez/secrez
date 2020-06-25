#!/usr/bin/env bash

echo 'Generating coverage report for @secrez/core'
(cd packages/core && npm test > coverage.report)
node bin/insert-coverage.js core
echo 'Generating coverage report for @secrez/fs'
(cd packages/fs && npm test > coverage.report)
echo 'Generating coverage report for secrez'
(cd packages/secrez && npm test > coverage.report)
#
#cp README.md packages/secrez/.


exit 1
