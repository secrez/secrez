const path = require('path')
const fs = require('./fs')

async function recursiveReadOnlyDir(dir) {
  let list = []
  let files = fs.readdirSync(dir)
  for (let file of files) {
    let filePath = path.join(dir, file)
    let stat = fs.lstatSync(filePath)
    if (stat.isDirectory()) {
      list.push(file)
      list = await list.concat(recursiveReadOnlyDir(filePath))
    }
  }
  return list
}

module.exports = recursiveReadOnlyDir
