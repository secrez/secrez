const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')
const _ = require('../packages/secrez/node_modules/lodash')
const pc = path.resolve(__dirname, '../packages/core/package.json')
const pf = path.resolve(__dirname, '../packages/fs/package.json')
const ps = path.resolve(__dirname, '../packages/secrez/package.json')
const pkgc = require(pc)
const pkgf = require(pf)
const pkgs = require(ps)

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

let cf = cs = 0
let changes = false

function getVersion(pkg) {
  return _.trim(execSync(`cd ${path.resolve(__dirname, `../packages/${pkg}`)} && npm version patch`).toString().replace(/v/, ''))
}

if (c && c === c2) {
  c2 = getVersion('core')
  pkgf.dependencies['@secrez/core'] = `^${c2}`
  pkgs.dependencies['@secrez/core'] = `^${c2}`
  cf = cs = 1
  changes = true
}

if (f && f === f2) {
  f2 = getVersion('fs')
  pkgs.dependencies['@secrez/fs'] = `^${f2}`.substring(1)
  cs = 1
  changes = true
}

if (s && s === s2) {
  s2 = getVersion('secrez')
  changes = true
}

if (cf) {
  fs.writeFileSync(pf, JSON.stringify(pkgf, null, 2))
}
if (cs) {
  fs.writeFileSync(ps, JSON.stringify(pkgs, null, 2))
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

return changes ? 1 : 0
