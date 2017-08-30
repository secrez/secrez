const path = require('path')
const fs = require('./fs')
const Crypto = require('./Crypto')

class Db {

  init(dir) {
    this.dir = dir

    // console.log('dir in db >>>', dir, '<<<')

    fs.ensureDirSync(dir)
  }

  file(key) {
    return path.join(this.dir, key)
  }

  get (key) {
    const file = this.file(key)
    // console.log('file', file)
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
    return /^[a-zA-Z0-9\$\+]{6}$/.test('' + id)
  }

  newId() {
    while (true) {
      let id = Crypto.getRandomString(6, 'base64').replace(/\/|\+/g, '0').toUpperCase().substring(0, 6)
      if (Db.isValidId(id) && !fs.existsSync(this.get(id))) {
        return id
      }
    }
  }

}

module.exports = Db