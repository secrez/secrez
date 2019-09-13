#!/usr/bin/env bash
for file in */ ; do
  if [[ -d "$file" && ! -L "$file" && -d "$file"node_modules ]]; then
  	echo "Purging "$file"node_modules"
    rm -rf $file"node_modules"
  fi
done
