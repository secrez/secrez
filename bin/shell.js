// This script runs like the global package.
// It is useful for debugging because it loads Secrez from the source, and is ignored in the npm package

const p = process.argv
for (let i=0;i<p.length;i++) {
  if (i && (p[i-1] === '--datadir')) {
    process.env.DATADIR = p[i]
  }
}

require('../src/shell')