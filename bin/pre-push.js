const {execSync} = require('child_process')

let changes

function checkAndGetCoverage(dir) {
  const org = dir === 'secrez' ? '' : '@secrez/'
  const pkg = `${org}${dir}`
  console.log(`Checking  ${pkg}`)
  const version = require(`../packages/${dir}/package.json`).version
  const currVersion = execSync(`npm view ${pkg} | grep latest`).toString().split('\n')[0].split(' ')[1]
  if (version !== currVersion) {
    console.log(`Getting coverage for ${pkg}`)
    console.log(execSync(`bin/get-coverage.sh ${dir} ${pkg}`).toString())
    changes = true
  }
}

checkAndGetCoverage('utils')
checkAndGetCoverage('test-helpers')
checkAndGetCoverage('crypto')
checkAndGetCoverage('core')
checkAndGetCoverage('courier')
checkAndGetCoverage('fs')
checkAndGetCoverage('hub')
checkAndGetCoverage('tls')
checkAndGetCoverage('tunnel')
checkAndGetCoverage('secrez')

if (!changes) {
  console.log('No upgrade needed.')
}
