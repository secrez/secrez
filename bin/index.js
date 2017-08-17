#!/usr/bin/env node

const p = process.argv
for (let i=0;i<p.length;i++) {
  if (i && (p[i-1] === '--datadir')) {
    process.env.DATADIR = p[i]
  }
}

require('../build/shell')