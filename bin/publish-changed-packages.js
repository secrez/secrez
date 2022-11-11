const {execSync} = require('child_process')

let changes

let gitDiff = execSync('git diff --name-only').toString().split('\n')

if (gitDiff.length > 0 && gitDiff[0]) {
  console.error('The repo is not committed.')
  // eslint-disable-next-line no-process-exit
  process.exit(1)
}

function checkIfMustBePublished(dir) {
  const pkg = dir === 'secrez' ? '' : '@secrez/'
  console.debug(`Checking  ${pkg}${dir}`)
  const version = require(`../packages/${dir}/package.json`).version
  const currVersion = execSync(`npm view ${pkg}${dir} | grep latest`).toString().split('\n')[0].split(' ')[1]
  if (version !== currVersion) {
    console.debug(`MUST PUBLISH ${pkg}${dir} v${version}`)
    // console.debug(execSync(`cd packages/${dir} && pnpm publish ${/beta/.test(version) ? '--tag beta' : ''}`) .toString())
    changes = true
  }
}

checkIfMustBePublished('utils', '@secrez')
checkIfMustBePublished('test-helpers', '@secrez')
checkIfMustBePublished('crypto', '@secrez')
checkIfMustBePublished('core', '@secrez')
checkIfMustBePublished('courier', '@secrez')
checkIfMustBePublished('fs', '@secrez')
checkIfMustBePublished('hub', '@secrez')
checkIfMustBePublished('tls', '@secrez')
checkIfMustBePublished('tunnel', '@secrez')
checkIfMustBePublished('migrate', '@secrez')
checkIfMustBePublished('secrez')

if (!changes) {
  console.debug('No upgrade needed.')
}
