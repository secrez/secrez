const path = require('path')
const pkg = require('../package')
const fs = require('./utils/fs')
const Crypto = require('./utils/Crypto')
const bs58 = require('bs58')
const config = require('./config')
const Utils = require('./utils')

class Secrez {

  async derivePassword (password, iterations) {
    password = Crypto.SHA3(password)
    return Crypto.deriveKey(password, Crypto.SHA3(password), iterations, 32)
  }

  async signup(password, iterations) {
    if (!fs.existsSync(config.confPath)) {
      password = await this.derivePassword(password, iterations)
      this.masterKey = Crypto.SHA3(Crypto.getRandomString(256))
      let keyHash = Crypto.SHA3(this.masterKey)
      const encryptedMasterKey = await Crypto.toAES(this.masterKey, password)
      const conf = {
        key: encryptedMasterKey,
        hash: bs58.encode(keyHash)
      }
      await fs.writeFileAsync(config.confPath, JSON.stringify(conf))
    } else {
      throw new Error('An account already exists. Please, login or indicate a different parent directory.')
    }
  }

  async login(password, iterations) {
    if (await fs.existsSync(config.confPath)) {
      let {key, hash} = require(config.confPath)
      password = await this.derivePassword(password, iterations)
      const masterKey = await Crypto.fromAES(key, password, true)
      if (bs58.encode(Crypto.SHA3(masterKey)) === hash) {
        this.masterKey = masterKey
      } else {
        throw new Error('The key file is corrupted.')
      }
    } else {
      throw new Error('Weird. An account does not exist. Please, Ctrl-C and run Secrez again.')
    }
  }

  encryptItem(item) {
    return Crypto.toAES(Buffer.from(item), this.masterKey)
  }

  decryptItem(item) {
    return Crypto.fromAES(item, this.masterKey).toString()
  }

  logout() {

  }

}

module.exports = Secrez
