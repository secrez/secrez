const fs = require('fs-extra')
const path = require('path')
const homedir = require('homedir')

const defRoot = `${homedir()}/.secrez-courier`

class Config {

  constructor(options = {}) {
    options = Object.assign({
      root: defRoot,
      hub: 'https://secrez.cc'
    }, options)
    let root = options.root
    if (process.env.NODE_ENV === 'test' && root === defRoot) {
      throw new Error('You are not supposed to test @secrez/courier in the default folder. This can lead to mistakes and loss of data.')
    }
    options.certsPath = path.join(root, 'certs')
    // options.dataPath = path.join(root, 'data')
    fs.ensureDirSync(options.certsPath)
    // fs.ensureDirSync(options.dataPath)
    this.options = options
  }

}

module.exports = Config
