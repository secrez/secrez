const fs = require('fs-extra')
const path = require('path')

const homedir = require('homedir')
const defRoot = `${homedir()}/.secrez-courier`
const defPort = 4433

class Config {

  constructor(options = {}) {
    this.options = options
    options.root = options.root || defRoot
    let root = options.root
    if (process.env.NODE_ENV === 'test' && root === defRoot) {
      throw new Error('You are not supposed to test @secrez/courier in the default folder. This can lead to mistakes and loss of data.')
    }
    options.port = options.port || defPort
    options.certsPath = path.join(root, 'certs')
    options.dataPath = path.join(root, 'data')
    fs.ensureDirSync(options.certsPath)
    fs.ensureDirSync(options.dataPath)
  }

}

module.exports = Config
