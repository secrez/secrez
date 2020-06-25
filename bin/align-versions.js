const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')
const _ = require('../packages/secrez/node_modules/lodash')
const pkgc = require(`../packages/core/package.json`)
const pkgf = require(`../packages/fs/package.json`)
const pkgs = require(`../packages/secrez/package.json`)

let [a,b,c,f,s] = process.argv
c = c.split(' ')[1]
f = f.split(' ')[1]
s = s.split(' ')[1]

let c2 = pkgc.version
let f2 = pkgf.version
let s2 = pkgs.version

console.log(c, c2)
console.log(f, f2)
console.log(s, s2)


if (c && c === c2) {
  c2 = execSync(`cd ${path.resolve(__dirname, '../packages/core')} && npm version patch`).toString()
  pkgf.dependencies['@secrez/core'] = `^${c2}`
  pkgs.dependencies['@secrez/core'] = `^${c2}`
}

if (f && f === f2) {
  f2 = execSync(`cd ${path.resolve(__dirname, '../packages/fs')} && npm version patch`).toString()
  pkgs.dependencies['@secrez/fs'] = `^${f2}`
}

if (s && s === s2) {
  s2 = execSync(`cd ${path.resolve(__dirname, '../packages/secrez')} && npm version patch`).toString()
}


console.log(c, c2)
console.log(f, f2)
console.log(s, s2)

// let version = (process.argv[3] || ' ').split(' ')[1]
// let pkg = require(`../packages/${target}/package.json`)
//
// if (pkg.version === version) {
//   return 1
// }
//
// return 0
