#!/usr/bin/env bash

cd "$(dirname "$0")"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then

  INSTALLED=$(which xclip)
  if [[ "$INSTALLED" == "" ]]; then
    echo "Please install xclip. On Debian/Ubuntu use 'sudo apt install xclip'"
  fi

elif [[ "$OSTYPE" == "darwin"* ]]; then

  mkdir -p build
  # One binary for Apple Silicon and Intel. Fall back to this machine
  # when the other SDK is not installed.
  if ! gcc -Wall -O3 -ObjC -arch arm64 -arch x86_64 \
    -framework Foundation -framework AppKit \
    -o build/impbcopy impbcopy.m; then
    gcc -Wall -O3 -ObjC -arch "$(uname -m)" \
      -framework Foundation -framework AppKit \
      -o build/impbcopy impbcopy.m
  fi

fi
