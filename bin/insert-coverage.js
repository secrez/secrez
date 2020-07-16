const path = require('path')
const fs = require('fs')
const _ = require('../packages/secrez/node_modules/lodash')

let target = process.argv[2]

if (![
  'core',
  'courier',
  'fs',
  'hub',
  'secrez',
  'tls',
  'tunnel',
  'utils'
].includes(target)) {
  console.error(`Wrong target: ${target}`)
  process.exit(1)
}

let coverage = fs.readFileSync(path.resolve(__dirname, '../packages', target, 'coverage.report'), 'utf8').split('\n')

let result = []
for (let row of coverage) {

  if (/  \d+ failing/.test(row)) {
    process.exit(1)
  }

  if (result[0]) {
    if (result[2] && !row) {
      break
    }
    result.push(row)
  }
  if (/  \d+ passing/.test(row)) {
    result.push(row)
  }

}

let text = '## Test coverage'

coverage = result.join('\n')

let p = path.resolve(__dirname, '../packages', target, 'README.md')

let README = fs.readFileSync(p, 'utf8').split(text)

let coverageSection = README[1].split('```')

coverageSection[1] = `\n${coverage}\n`

let readme = `${README[0]}${text}${coverageSection.join('```')}`

fs.writeFileSync(p, readme)

