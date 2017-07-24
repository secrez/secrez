const path = require('path')
const fs = require('./fs')
const Crypto = require('./Crypto')
const {keys, SYNC, ASYNC} = require('../config/constants')

class Db {

  init(dir, mode = ASYNC) {
    this.dir = dir
    if (mode === SYNC) {
      fs.ensureDirSync(dir)
    } else {
      return fs.ensureDirAsync(dir)
    }
  }

  file(key) {
    return path.join(this.dir, key)
  }

  get(key) {
    const file = this.file(key)
    if (fs.existsSync(file)) {
      return fs.readFileAsync(file, 'utf-8')
    } else {
      return Promise.resolve()
    }
  }

  put(key, value) {
    const file = this.file(key)
    return fs.ensureDirAsync(path.dirname(file))
        .then(() => {
          return fs.writeFileAsync(file, value)
        })
  }

  static isValidId(id) {
    return /^[a-zA-Z0-9\$\+]{6}$/.test(id)
  }

  newId(mode = ASYNC) {
    while (true) {
      let id = Crypto.getRandomString(6, 'base64', SYNC).replace(/\/|\+/g, '0').toUpperCase().substring(0,6)
      if (Db.isValidId(id) && !fs.existsSync(this.get(id))) {
        if (mode === SYNC) {
          return id
        } else {
          return Promise.resolve(id)
        }
      }
    }
  }

}

module.exports = Db