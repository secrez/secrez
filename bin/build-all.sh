#!/usr/bin/env bash

(
  cd packages/secrez
  yarn build
)
(
  cd packages/core
  yarn build
)
