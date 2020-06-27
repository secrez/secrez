const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')

const corePath = path.resolve(__dirname, '../packages/core/package.json')
const fsPath = path.resolve(__dirname, '../packages/fs/package.json')
const secrezPath = path.resolve(__dirname, '../packages/secrez/package.json')

const corePackage = require(corePath)
const fsPackage = require(fsPath)
const secrezPackage = require(secrezPath)

let packages = {}
execSync(`git diff master --name-only`).toString().split('\n').map(e => {
  let m = e.split('/')
  if (m[0] === 'packages' && m[2] !== 'README.md') {
    packages[m[1]] = true
  }
  return e
})

function getDiff(dir, pkg) {
  let ver = execSync(`npm view ${pkg || dir} | grep latest`).toString().split('\n')[0].split(' ')[1]
  return [ver, packages[dir]]
}

let [corePublished, coreChange] = getDiff('core', '@secrez/core')
let [fsPublished, fsChange] = getDiff('fs', '@secrez/fs')
let [secrezPublished, secrezChange] = getDiff('secrez')

let coreVersion = corePackage.version
let fsVersion = fsPackage.version
let secrezVersion = secrezPackage.version

console.log(corePublished, fsPublished, secrezPublished, coreVersion, fsVersion, secrezVersion)



function incVersion(v) {
  v = v.split('.')
  v[2] = parseInt(v[2]) + 1
  return v.join('.')
}

if (coreChange) {
  coreVersion = incVersion(corePublished)
  console.log(`Updating @secrez/core to ${coreVersion}`)
  corePackage.version = coreVersion
  fsPackage.dependencies['@secrez/core'] = `^${coreVersion}`
  secrezPackage.dependencies['@secrez/core'] = `^${coreVersion}`
  coreChange = fsChange = secrezChange = true
}

if (fsChange) {
  fsVersion = incVersion(fsPublished)
  console.log(`Updating @secrez/fs to ${fsVersion}`)
  fsPackage.version = fsVersion
  secrezPackage.dependencies['@secrez/fs'] = `^${fsVersion}`.substring(1)
  fsChange = secrezChange = true
}

if (secrezChange) {
  secrezVersion = incVersion(secrezPublished)
  console.log(`Updating secrez to ${secrezVersion}`)
  secrezPackage.version = secrezVersion
  secrezChange = true
}

if (coreChange) {
  // console.log(corePackage)
  fs.writeFileSync(corePath, JSON.stringify(corePackage, null, 2))
}
if (fsChange) {
  // console.log(fsPackage)
  fs.writeFileSync(fsPath, JSON.stringify(fsPackage, null, 2))
}
if (secrezChange) {
  // console.log(secrezPackage)
  fs.writeFileSync(secrezPath, JSON.stringify(secrezPackage, null, 2))
}



if (coreChange || fsChange || secrezChange) {
  execSync('npm run reset')
} else {
  console.log('No change required')
}
