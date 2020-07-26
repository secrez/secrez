const Crypto = require('./Crypto')
const utils = require('@secrez/utils')
const bs58 = Crypto.bs58

const $ = {}

module.exports = function (rand) {

  $[rand] = {}
  $[rand].sharedKeys = {}

  class _Secrez {

    async init(password, iterations, derivationVersion) {
      $[rand].password = password
      $[rand].iterations = iterations
      $[rand].derivedPassword = await _Secrez.derivePassword(password, iterations, derivationVersion)
    }

    async isInitiated() {
      return !!$[rand].derivedPassword
    }

    async signup() {
      $[rand].masterKey = Crypto.generateKey()
      let key = this.preEncrypt($[rand].masterKey)
      let hash = Crypto.b58Hash($[rand].masterKey)
      return {
        key,
        hash
      }
    }

    initPrivateKeys(box, sign) {
      $[rand].boxPrivateKey = box
      $[rand].signPrivateKey = sign
    }

    signMessage(message) {
      return Crypto.getSignature(message, $[rand].signPrivateKey)
    }

    isItRight(password) {
      // to allow to change it
      return password === $[rand].password
    }

    async changePassword(password = $[rand].password, iterations = $[rand].iterations) {
      let data = this.conf.data
      let dv = _Secrez.derivationVersion.TWO
      $[rand].password = password
      $[rand].iterations = iterations
      $[rand].derivedPassword = await _Secrez.derivePassword(password, iterations, dv)
      delete data.keys
      data.key = this.preEncrypt($[rand].masterKey)
      data.derivationVersion = dv
      return data
    }

    async restoreKey() {
      delete this.conf.data.keys
      this.conf.data.key = this.preEncrypt($[rand].masterKey)
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
      let publicKey = Crypto.fromBase58(conf.data.sign.publicKey)
      return Crypto.verifySignature(JSON.stringify(this.sortObj(conf.data)), conf.signature, publicKey)
    }

    async signin(data) {
      try {
        $[rand].masterKey = await this.preDecrypt(data.key, true)
        $[rand].boxPrivateKey = Crypto.fromBase58(this.decrypt(data.box.secretKey))
        $[rand].signPrivateKey = Crypto.fromBase58(this.decrypt(data.sign.secretKey))
      } catch (e) {
        throw new Error('Wrong password or wrong number of iterations')
      }
      if (utils.secureCompare(Crypto.b58Hash($[rand].masterKey), data.hash)) {
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
        if (!utils.secureCompare(Crypto.b58Hash(masterKey), data.hash)) {
          throw new Error('Hash on file does not match the master key')
        }
        $[rand].masterKey = masterKey
        $[rand].boxPrivateKey = Crypto.fromBase58(this.decrypt(data.box.secretKey))
        $[rand].signPrivateKey = Crypto.fromBase58(this.decrypt(data.sign.secretKey))
        return data.hash
      } catch (e) {
        throw new Error('Wrong data/secret')
      }
    }

    static async derivePassword(
        password = $[rand].password,
        iterations,
        derivationVersion
    ) {
      password = Crypto.SHA3(password)
      let salt = derivationVersion === _Secrez.derivationVersion.TWO
          ? Crypto.SHA3(password + iterations.toString())
          : Crypto.SHA3(password)
      return bs58.encode(Crypto.deriveKey(password, salt, iterations, 32))
    }

    encrypt(data) {
      return Crypto.encrypt(data, $[rand].masterKey)
    }

    decrypt(encryptedData) {
      return Crypto.decrypt(encryptedData, $[rand].masterKey)
    }

    preEncrypt(data) {
      return Crypto.encrypt(data, $[rand].derivedPassword)
    }

    preDecrypt(encryptedData, unsafeMode) {
      let data = Crypto.decrypt(encryptedData, $[rand].derivedPassword)
      if (!unsafeMode && data === $[rand].masterKey) {
        throw new Error('Attempt to hack the master key')
      }
      return data
    }

    getSharedKey(publicKey) {
      if (!$[rand].sharedKeys[publicKey]) {
        let publicKeyArr = Crypto.fromBase58(publicKey.split('0')[0])
        $[rand].sharedKeys[publicKey] = Crypto.getSharedSecret(publicKeyArr, $[rand].boxPrivateKey)
      }
      return $[rand].sharedKeys[publicKey]
    }

    encryptShared(data, publicKey) {
      return Crypto.boxEncrypt(this.getSharedKey(publicKey), data)
    }

    decryptShared(encryptedData, publicKey) {
      return Crypto.boxDecrypt(this.getSharedKey(publicKey), encryptedData)
    }

    encodeSignature(secret) {
      const encoded = bs58.encode(Buffer.from(Crypto.SHA3(secret)))
      return encoded
    }

    generateSharedSecrets(secret) {
      let parts = Crypto.splitSecret($[rand].masterKey, 2, 2)
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

  _Secrez.derivationVersion = {
    ONE: '1',
    TWO: '2'
  }

  return _Secrez

}
