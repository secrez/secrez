#!/usr/bin/env bash

VERCORE=0
VERFS=0
VERSECREZ=0

DIFF=$(git diff packages/core)
if [[ "$DIFF" != "" ]]; then
  VERCORE=$(npm view @secrez/core | grep latest)
fi
DIFF=$(git diff packages/fs)
if [[ "$DIFF" != "" ]]; then
  VERFS=$(npm view @secrez/fs | grep latest)
fi
DIFF=$(git diff packages/secrez)
if [[ "$DIFF" != "" ]]; then
  VERSECREZ=$(npm view secrez | grep latest)
fi

node bin/align-versions.js "$VERCORE" "$VERFS" "$VERSECREZ"

