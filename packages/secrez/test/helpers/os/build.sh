#!/usr/bin/env bash

if [[ "$OSTYPE" === "linux-gnu"* ]]; then

  INSTALLED=$(which xclip)
  if [[ "$INSTALLED" === "" ]]; then
    echo "Please install xclip. On Debian/Ubuntu use 'sudo apt install xclip'"
  fi

elif [[ "$OSTYPE" === "darwin"* ]]; then

  gcc -Wall -g -O3 -ObjC -framework Foundation -framework AppKit -o build/impbcopy impbcopy.m

fi
