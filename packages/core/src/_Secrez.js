const Crypto = require('./utils/Crypto')
const utils = require('./utils')
const bs58 = require('bs58')

let _masterKey
let _derivedPassword

class _Secrez {

  async init(password, iterations) {
    _derivedPassword = await this.derivePassword(password, iterations)
  }

  async isInitiated() {
    return !!_derivedPassword
  }

  async signup() {
    _masterKey = Crypto.generateKey()
    let key = this.preEncrypt(_masterKey)
    let hash = Crypto.b58Hash(_masterKey)
    return {
      key,
      hash
    }
  }

  async restoreKey() {
    delete this.conf.data.keys
    this.conf.data.key = this.preEncrypt(_masterKey)
  }

  setConf(conf, doNotVerify) {
    if (doNotVerify || this.verifySavedData(conf)) {
      this.conf = conf
      return true
    } else {
      throw new Error('The configuration file is corrupted')
    }
  }

  verifySavedData(conf) {
    let publicKey = Crypto.fromBase58(conf.data.sign.publicKey)
    return Crypto.verifySignature(JSON.stringify(this.sortObj(conf.data)), conf.signature, publicKey)
  }

  async signin(data) {
    try {
      _masterKey = await this.preDecrypt(data.key, true)
      this.boxKey = Crypto.fromBase58(this.decrypt(data.box.secretKey))
      this.signKey = Crypto.fromBase58(this.decrypt(data.sign.secretKey))
    } catch (e) {
      throw new Error('Wrong password or wrong number of iterations')
    }
    if (utils.secureCompare(Crypto.b58Hash(_masterKey), data.hash)) {
      return data.hash
    } else {
      throw new Error('Hash on file does not match the master key')
    }
  }

  async sharedSignin(data, authenticator, secret) {
    let key = data.keys[authenticator]
    try {
      let masterKey = this.recoverSharedSecrets(key.parts, secret)
      if (!utils.secureCompare(Crypto.b58Hash(masterKey), data.hash)) {
        throw new Error('Hash on file does not match the master key')
      }
      _masterKey = masterKey
      this.boxKey = Crypto.fromBase58(this.decrypt(data.box.secretKey))
      this.signKey = Crypto.fromBase58(this.decrypt(data.sign.secretKey))
      return data.hash
    } catch (e) {
      throw new Error('Wrong data/secret')
    }
  }

  getEncryptedMasterKey() {
    if (!_masterKey) {
        throw new Error('Master key not found')
    }
    if (!this.conf || !this.conf.data) {
      throw new Error('Data not loaded')
    }
    if (this.conf.data.key) {
      return this.conf.data.key
    } else {
      return this.preEncrypt(_masterKey)
    }
  }

  async derivePassword(password, iterations) {
    password = Crypto.SHA3(password)
    const salt = Crypto.SHA3(password)
    return bs58.encode(Crypto.deriveKey(password, salt, iterations, 32))
  }

  encrypt(data) {
    return Crypto.encrypt(data, _masterKey)
  }

  decrypt(encryptedData) {
    return Crypto.decrypt(encryptedData, _masterKey)
  }

  preEncrypt(data) {
    return Crypto.encrypt(data, _derivedPassword)
  }

  preDecrypt(encryptedData, unsafeMode) {
    let data = Crypto.decrypt(encryptedData, _derivedPassword)
    if (!unsafeMode && data === _masterKey) {
      throw new Error('Attempt to hack the master key')
    }
    return data
  }

  encodeSignature(secret) {
    const encoded = bs58.encode(Buffer.from(Crypto.SHA3(secret)))
    return encoded
  }

  generateSharedSecrets(secret) {
    let parts = Crypto.splitSecret(_masterKey, 2, 2)
    parts[1] = this.preEncrypt(bs58.encode(Buffer.from(parts['1'])))
    parts[2] = Crypto.encrypt(bs58.encode(Buffer.from(parts['2'])), this.encodeSignature(secret))
    return parts
  }

  recoverSharedSecrets(parts, secret) {
    parts = {
      1: new Uint8Array(bs58.decode(this.preDecrypt(parts[1]))),
      2: new Uint8Array(bs58.decode(Crypto.decrypt(parts[2], this.encodeSignature(secret))))
    }
    return Crypto.joinSecret(parts)//, true)
  }

  signData(data) {
    const signature = Crypto.getSignature(JSON.stringify(this.sortObj(data)), this.signKey)
    const conf = {
      data,
      signature
    }
    return conf
  }

  sortObj(obj) {
    const sortedData = {}
    for (let prop of Object.keys(obj).sort()) {
      if (typeof obj[prop] === 'object') {
        obj[prop] = this.sortObj(obj[prop])
      }
      sortedData[prop] = obj[prop]
    }
    return sortedData
  }

}


module.exports = _Secrez
