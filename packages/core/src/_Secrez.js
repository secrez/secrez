const fs = require('fs-extra')
const utils = require('@secrez/utils')

const Crypto = require('./Crypto')
const bs64 = Crypto.bs64

module.exports = function () {

  const __ = {
    sharedKeys: {},
    getSharedKey(publicKey) {
      if (!__.sharedKeys[publicKey]) {
        let publicKeyArr = Crypto.bs64.decode(publicKey.split('$')[0])
        __.sharedKeys[publicKey] = Crypto.getSharedSecret(publicKeyArr, __.boxPrivateKey)
      }
      return __.sharedKeys[publicKey]
    }
  }

  class _Secrez {

    constructor(secrez) {
      this.secrez = secrez
    }

    async init(password, iterations) {
      __.password = password
      __.iterations = iterations
      __.derivedPassword = await _Secrez.derivePassword(password, iterations)
    }

    async isInitiated() {
      return !!__.derivedPassword
    }

    async signup() {
      __.masterKey = Crypto.generateKey()
      __.masterKeyArray = Crypto.bs64.decode(__.masterKey)
      let key = this.preEncrypt(__.masterKey)
      let hash = Crypto.b64Hash(__.masterKey)
      return {
        key,
        hash
      }
    }

    initPrivateKeys(box, sign) {
      __.boxPrivateKey = box
      __.signPrivateKey = sign
    }

    signMessage(message) {
      return Crypto.getSignature(message, __.signPrivateKey)
    }

    async verifyPassword(password) {
      return __.derivedPassword === await _Secrez.derivePassword(password, __.iterations)
    }

    async changePassword(password = __.password, iterations = __.iterations) {
      let data = this.conf.data
      __.password = password
      __.iterations = iterations
      __.derivedPassword = await _Secrez.derivePassword(password, iterations)
      delete data.keys
      data.key = this.preEncrypt(__.masterKey)
      return data
    }

    async restoreKey() {
      delete this.conf.data.keys
      this.conf.data.key = this.preEncrypt(__.masterKey)
    }

    setConf(conf, doNotVerify) {
      /* istanbul ignore if  */
      if (!doNotVerify && !this.verifySavedData(conf)) {
        throw new Error('The configuration file is corrupted')
      } else {
        this.conf = conf
        return true
      }
    }

    verifySavedData(conf) {
      let publicKey = Crypto.bs64.decode(conf.data.sign.publicKey)
      return Crypto.verifySignature(JSON.stringify(this.sortObj(conf.data)), conf.signature, publicKey)
    }

    async signin(data) {
      try {
        __.masterKey = await this.preDecrypt(data.key, true)
        __.masterKeyArray = Crypto.bs64.decode(__.masterKey)
        __.boxPrivateKey = this.decrypt(data.box.secretKey, true, true)
        __.signPrivateKey = this.decrypt(data.sign.secretKey, true, true)
      } catch (e) {
        throw new Error('Wrong password or wrong number of iterations')
      }
      if (utils.secureCompare(Crypto.b64Hash(__.masterKey), data.hash)) {
        return data.hash
      } else {
        throw new Error('Hash on file does not match the master key')
      }
    }

    async sharedSignin(data, authenticator, secret) {
      let key = data.keys[authenticator]
      try {
        let masterKey = this.recoverSharedSecrets(key.parts, secret)
        /* istanbul ignore if  */
        if (!utils.secureCompare(Crypto.b64Hash(masterKey), data.hash)) {
          throw new Error('Hash on file does not match the master key')
        }
        __.masterKey = masterKey
        __.masterKeyArray = Crypto.bs64.decode(__.masterKey)
        __.boxPrivateKey = this.decrypt(data.box.secretKey, true, true)
        __.signPrivateKey = this.decrypt(data.sign.secretKey, true, true)
        return data.hash
      } catch (e) {
        throw new Error('Wrong data/secret')
      }
    }

    static async derivePassword(
        password = __.password,
        iterations
    ) {
      password = Crypto.SHA3(password)
      let salt = Crypto.SHA3(password + iterations.toString())
      return bs64.encode(Crypto.deriveKey(password, salt, iterations, 32))
    }

    encrypt(data, urlSafe) {
      let encrypted = Crypto.encrypt(data, __.masterKeyArray)
      if (urlSafe) {
        encrypted = Crypto.fromBase64ToUrlSafeBase64(encrypted)
      }
      return encrypted
    }

    decrypt(encryptedData, urlSafe, unsafeMode) {
      if (urlSafe) {
        encryptedData = Crypto.fromUrlSafeBase64ToBase64(encryptedData)
      }
      if (!unsafeMode && (
          encryptedData === this.conf.data.box.secretKey
          || encryptedData === this.conf.data.sign.secretKey
      )) {
        throw new Error('Attempt to hack the keys')
      }
      return Crypto.decrypt(encryptedData, __.masterKeyArray)
    }

    preEncrypt(data) {
      return Crypto.encrypt(data, __.derivedPassword)
    }

    readConf() {
      /* istanbul ignore if  */
      if (!this.secrez) {
        throw new Error('Secrez not initiated')
      }
      /* istanbul ignore if  */
      if (!fs.existsSync(this.secrez.config.keysPath)) {
        throw new Error('Account not set yet')
      }
      return JSON.parse(fs.readFileSync(this.secrez.config.keysPath, 'utf8'))
    }

    preDecrypt(encryptedData, unsafeMode) {
      let conf = this.conf
      if (!conf) {
        conf = this.readConf()
      }
      if (!unsafeMode && encryptedData === conf.data.key) {
        throw new Error('Attempt to hack the master key')
      }
      return Crypto.decrypt(encryptedData, __.derivedPassword)
    }

    encryptShared(data, publicKey) {
      return Crypto.boxEncrypt(__.getSharedKey(publicKey), data)
    }

    decryptShared(encryptedData, publicKey) {
      return Crypto.boxDecrypt(__.getSharedKey(publicKey), encryptedData)
    }

    generateSharedSecrets(secret) {
      let parts = Crypto.splitSecret(__.masterKey, 2, 2)
      parts[1] = this.preEncrypt(bs64.encode(Buffer.from(parts['1'])))
      parts[2] = Crypto.encrypt(bs64.encode(Buffer.from(parts['2'])), Crypto.SHA3(secret))
      return parts
    }

    recoverSharedSecrets(parts, secret) {
      parts = {
        1: bs64.decode(this.preDecrypt(parts[1])),
        2: bs64.decode(Crypto.decrypt(parts[2], Crypto.SHA3(secret)))
      }
      return Crypto.joinSecret(parts)//, true)
    }


    signData(data) {
      const signature = this.signMessage(JSON.stringify(this.sortObj(data)))
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

  return _Secrez
}
