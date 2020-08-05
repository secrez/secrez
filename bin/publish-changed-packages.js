#!/usr/bin/env node

const {execSync} = require('child_process')

let changes

function checkAndPublish(dir) {
  const pkg = dir === 'secrez' ? '' : '@secrez/'
  const version = require(`../packages/${dir}/package.json`).version
  const currVersion = execSync(`npm view ${pkg}${dir} | grep latest`).toString().split('\n')[0].split(' ')[1]
  if (version !== currVersion) {
    console.log(`Publishing  ${pkg}${dir} v${version}`)
    console.log(execSync(`cd packages/${dir} && pnpm publish ${/beta/.test(version) ? '--tag beta' : ''}`) .toString())
    changes = true
  }
}

checkAndPublish('utils', '@secrez')
checkAndPublish('core', '@secrez')
checkAndPublish('courier', '@secrez')
checkAndPublish('fs', '@secrez')
checkAndPublish('hub', '@secrez')
checkAndPublish('tls', '@secrez')
checkAndPublish('tunnel', '@secrez')
checkAndPublish('test-helpers', '@secrez')
// checkAndPublish('secrez')

if (!changes) {
  console.log('No upgrade needed.')
}
