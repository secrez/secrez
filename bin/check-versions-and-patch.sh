#!/usr/bin/env bash

VERCORE=0
VERFS=0
VERSECREZ=0
BRANCH=$(git rev-parse --abbrev-ref HEAD)

DIFF=$(git diff master..$BRANCH packages/core)
if [[ "$DIFF" != "" ]]; then
  VERCORE=$(npm view @secrez/core | grep latest)
fi
DIFF=$(git diff master..$BRANCH packages/fs)
if [[ "$DIFF" != "" ]]; then
  VERFS=$(npm view @secrez/fs | grep latest)
fi
DIFF=$(git diff master..$BRANCH packages/secrez)
if [[ "$DIFF" != "" ]]; then
  VERSECREZ=$(npm view secrez | grep latest)
fi

CHANGES=$(node bin/align-versions.js "$VERCORE" "$VERFS" "$VERSECREZ")

echo $CHANGES

