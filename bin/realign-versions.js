const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')
const pc = path.resolve(__dirname, '../packages/core/package.json')
const pf = path.resolve(__dirname, '../packages/fs/package.json')
const ps = path.resolve(__dirname, '../packages/secrez/package.json')
const pkgc = require(pc)
const pkgf = require(pf)
const pkgs = require(ps)

const branch=execSync('git rev-parse --abbrev-ref HEAD').toString().replace(/(v|\n)/g, '')

function getDiff(dir, pkg) {
  if (execSync(`git diff master..$BRANCH packages/${dir}`).toString().split('\n')[0]) {
    let ver = execSync(`npm view ${pkg || dir} | grep latest`).toString().split('\n')[0].split(' ')[1]
    return ver
  }
  return '0'
}

let c = getDiff('core', '@secrez/core')
let f = getDiff('fs', '@secrez/fs')
let s = getDiff('secrez')

let c2 = pkgc.version
let f2 = pkgf.version
let s2 = pkgs.version

let cf = cs = cc = 0
let changes = false

function incVersion(v) {
  v = v.split('.')
  v[2] = parseInt(v[2]) + 1
  return v.join('.')
}

if (c && c === c2) {
  c2 = incVersion(c2)
  console.log(`Updating @secrez/core to ${c2}`)
  pkgc.version = c2
  pkgf.dependencies['@secrez/core'] = `^${c2}`
  pkgs.dependencies['@secrez/core'] = `^${c2}`
  cc = cf = cs = 1
  changes = true
}

if (f && f === f2) {
  f2 = incVersion(f2)
  console.log(`Updating @secrez/fs to ${f2}`)
  pkgf.version = f2
  pkgs.dependencies['@secrez/fs'] = `^${f2}`.substring(1)
  cf = cs = 1
  changes = true
}

if (s && s === s2) {
  s2 = incVersion(s2)
  console.log(`Updating secrez to ${s2}`)
  pkgs.version = s2
  cs = 1
  changes = true
}

if (cc) {
  fs.writeFileSync(pf, JSON.stringify(pkgc, null, 2))
}
if (cf) {
  fs.writeFileSync(pf, JSON.stringify(pkgf, null, 2))
}
if (cs) {
  fs.writeFileSync(ps, JSON.stringify(pkgs, null, 2))
}

if (changes) {
  execSync('npm run reset')
} else {
  console.log('No change required')
}
