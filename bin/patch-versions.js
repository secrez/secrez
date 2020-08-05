#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')

let packages = {}
execSync(`git diff master --name-only`).toString().split('\n').map(e => {
  let m = e.split('/')
  if (m[0] === 'packages' && m[2] === 'src') {
    packages[m[1]] = true
  }
  return e
})

let packagesFolder = fs.readdirSync(path.resolve(__dirname, '../packages'))

let packagesJson = {}

for (let package of packagesFolder) {
  let pjsonPath = path.resolve(__dirname, '../packages', package, 'package.json')
  if (fs.existsSync(pjsonPath)) {
    packagesJson[package] = require(path.resolve(__dirname, '../packages', package, 'package.json'))
  }
}

function getExistingVersion(pkg) {
  return execSync(`npm view ${pkg} | grep latest`).toString().split('\n')[0].split(' ')[1]
}


function updateOtherPackages(package, name, newVersion) {
  for (let p in packages) {
    if (p === package) {
      continue
    }
    let json = packagesJson[p]
    if (json.dependencies[name]) {
      json.dependencies[name] = 'workspace:^'+ newVersion
    }
    if (json.devDependencies[name]) {
      json.devDependencies[name] = 'workspace:^'+ newVersion
    }
  }
}

for (let p in packages) {
  let json = packagesJson[p]
  let {version, name} = json
  if(version === getExistingVersion(name)) {
    let v = version.split('.')
    v[2] = parseInt(v[2]) + 1
    v = v.join('.')
    json.version = v
    updateOtherPackages(p, name, v)
  }

}

for (let p in packagesJson) {
  fs.writeFileSync(path.resolve(__dirname, '../packages', p, 'package.json'), JSON.stringify(packagesJson[p], null, 2))
}
