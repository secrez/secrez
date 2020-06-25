const path = require('path')
const fs = require('fs')
const {execSync} = require('child_process')

let changes
function checkAndPublish(dir, pkg) {
  const version = require(`../packages/${dir}/package.json`).version
  const currVersion = execSync(`npm view ${pkg ? pkg + '/' : '' }${dir} | grep latest`).toString().split('\n')[0].split(' ')[1]
  if (version !== currVersion) {
    console.log(`Publishing  ${pkg ? pkg + '/' : '' }${dir} v${version}`)
    console.log(execSync(`cd packages/${dir} && npm publish`).toString())
    changes = true
  }
}

checkAndPublish('core', '@secrez')
checkAndPublish('fs', '@secrez')
checkAndPublish('secrez')

if (!changes) {
  console.log('No upgrade needed.')
}
