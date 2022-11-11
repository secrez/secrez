#!/usr/bin/env bash

cd packages/core
pnpm run test
cd ../fs
pnpm run test
cd ../tunnel
pnpm run test
cd ../courier
pnpm run test
cd ../hub
pnpm run test
cd ../test-helpers
pnpm run test
cd ../utils
pnpm run test
cd ../crypto
pnpm run test
cd ../migrate
pnpm run test
 cd ../tls
pnpm run test
cd ../secrez
pnpm run test
cd ../..

