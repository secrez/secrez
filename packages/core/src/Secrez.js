const homedir = require('homedir')
const fs = require('fs-extra')
const _ = require('lodash')
const Crypto = require('./Crypto')
const ConfigUtils = require('./config/ConfigUtils')
const Entry = require('./Entry')
const utils = require('@secrez/utils')
const pkg = require('../package.json')

module.exports = function () {

  let _secrez
  const _Secrez = require('./_Secrez')()

  class Secrez {

    constructor() {
      this.config = _.clone(require('./config'))
      this.types = this.config.types
    }

    async init(
        container = `${homedir()}/.secrez`,
        localWorkingDir = homedir()
    ) {
      if (process.env.NODE_ENV === 'test' && container === `${homedir()}/.secrez`) {
        throw new Error('You are not supposed to test Secrez in the default folder. This can lead to mistakes and loss of data.')
      }
      this.config = await ConfigUtils.setSecrez(this.config, container, localWorkingDir)
    }

    async signup(password, iterations,
                 // to test the upgrade from 1 to 2
                 testDerivationVersion
    ) {
      if (!this.config || !this.config.keysPath) {
        throw new Error('Secrez not initiated')
      }
      if (!await fs.pathExists(this.config.keysPath)) {

        let id = Crypto.b64Hash(Crypto.generateKey())
        _secrez = new _Secrez(this)

        await _secrez.init(password, iterations)

        let {key, hash} = await _secrez.signup()
        this.masterKeyHash = hash

        // x25519-xsalsa20-poly1305
        const boxPair = Crypto.generateBoxKeyPair()
        const box = {
          secretKey: _secrez.encrypt(boxPair.secretKey),
          publicKey: Crypto.bs64.encode(boxPair.publicKey)
        }

        // ed25519
        const ed25519Pair = Crypto.generateSignatureKeyPair()
        const sign = {
          secretKey: _secrez.encrypt(ed25519Pair.secretKey),
          publicKey: Crypto.bs64.encode(ed25519Pair.publicKey)
        }

        _secrez.initPrivateKeys(boxPair.secretKey, ed25519Pair.secretKey)

        const data = {
          id,
          sign,
          box,
          key,
          hash,
          when: _secrez.encrypt(Date.now().toString()),
          version: this.config.VERSION
        }
        _secrez.setConf(await this.signAndSave(data), true)
      } else {
        throw new Error('An account already exists. Please, sign in or chose a different container directory')
      }
    }

    async derivePassword(password, iterations) {
      return await _Secrez.derivePassword(password, iterations)
    }

    async signAndSave(data) {
      const conf = _secrez.signData(data)
      await fs.writeFile(this.config.keysPath, JSON.stringify(conf))
      return conf
    }

    async saveIterations(iterations) {
      const env = await ConfigUtils.getEnv(this.config)
      env.iterations = iterations
      await ConfigUtils.putEnv(this.config, env)
    }

    generateSharedSecrets(secret) {
      return _secrez.generateSharedSecrets(secret)
    }

    async removeSharedSecret(authenticator, all) {
      let data = _secrez.conf.data
      let code = 1
      let removeAll = true
      if (!all) {
        if (data.keys && data.keys[authenticator]) {
          delete data.keys[authenticator]
        }
        for (let authenticator in data.keys) {
          if (data.keys[authenticator].type === this.config.sharedKeys.FIDO2_KEY) {
            removeAll = false
            break
          }
        }
      }
      if (removeAll) {
        code = 2
        _secrez.restoreKey()
      }
      let conf = await this.signAndSave(data)
      _secrez.setConf(conf, true)
      return code
    }

    async saveSharedSecrets(sharedData) {
      let conf = await this.readConf()
      if (!conf.data.keys) {
        conf.data.keys = {}
      }
      let authenticator = sharedData.authenticator
      delete sharedData.authenticator
      if (sharedData.id) {
        sharedData.id = this.preEncryptData(sharedData.id)
      }
      if (sharedData.salt) {
        sharedData.salt = this.preEncryptData(sharedData.salt)
      }
      if (sharedData.credential) {
        sharedData.credential = this.preEncryptData(sharedData.credential)
      }
      conf.data.keys[authenticator] = sharedData
      if (conf.data.key) {
        delete conf.data.key
      }
      conf = await this.signAndSave(conf.data)
      _secrez.setConf(conf, true)
      return conf
    }

    getConf() {
      return _secrez.conf
    }

    getPublicKey() {
      return _secrez.conf.data.box.publicKey + '$' + _secrez.conf.data.sign.publicKey
    }

    async readConf() {
      if (!this.config || !this.config.keysPath) {
        throw new Error('Secrez not initiated')
      }
      if (await fs.pathExists(this.config.keysPath)) {
        return JSON.parse(await fs.readFile(this.config.keysPath, 'utf8'))
      } else {
        throw new Error('Account not set yet')
      }
    }

    async upgradeAccount(password, iterations) {
      let data = await _secrez.changePassword(password, iterations)
      _secrez.setConf(await this.signAndSave(data), true)
    }

    async verifyPassword(password) {
      return await _secrez.verifyPassword(password)
    }

    signMessage(message) {
      return _secrez.signMessage(message)
    }

    verifySignedMessage(message, signature, publicKey) {
      return Crypto.verifySignature(message, signature, Crypto.bs64.decode(publicKey || this.getConf().data.sign.publicKey))
    }

    async signin(password, iterations) {
      if (!this.config || !this.config.keysPath) {
        throw new Error('Secrez not initiated')
      }
      if (!iterations) {
        const env = await ConfigUtils.getEnv(this.config)
        iterations = env.iterations
      }
      if (!iterations || iterations !== parseInt(iterations.toString())) {
        throw new Error('Iterations is missed')
      }
      iterations = parseInt(iterations)
      const conf = await this.readConf()
      const data = conf.data
      _secrez = new _Secrez(this)
      await _secrez.init(password, iterations)
      /* istanbul ignore if  */
      if (!data.key && !data.keys) {
        throw new Error('No valid data found')
      }
      if (data.key) {
        let masterKeyHash = await _secrez.signin(data)
        this.setMasterKeyHash(conf, masterKeyHash)
      } else {
        throw new Error('A second factor is required')
      }
      return 0
    }

    async getSecondFactorData(authenticator) {
      if (!this.config || !this.config.keysPath || !_secrez || !_secrez.isInitiated()) {
        throw new Error('A standard sign in must be run before to initiate Secrez')
      }
      const conf = await this.readConf()
      let data = conf.data.keys[authenticator]
      if (data) {
        return data
      } else {
        throw new Error(`No registered data with the authenticator ${authenticator}`)
      }
    }

    async sharedSignin(authenticator, secret) {
      if (!this.config || !this.config.keysPath || !_secrez || !_secrez.isInitiated()) {
        throw new Error('A standard sign in must be run before to initiate Secrez')
      }
      const conf = await this.readConf()
      const data = conf.data
      /* istanbul ignore if  */
      if (!data.keys) {
        throw new Error('No second factor registered')
      }
      if (!data.keys[authenticator]) {
        throw new Error(`No second factor registered with the authenticator ${authenticator}`)
      }
      let masterKeyHash = await _secrez.sharedSignin(data, authenticator, secret)
      this.setMasterKeyHash(conf, masterKeyHash)
      return 0
    }

    setMasterKeyHash(conf, masterKeyHash) {
      /* istanbul ignore if  */
      if (!_secrez.setConf(conf)) {
        throw new Error('keys.json looks corrupted')
      }
      this.masterKeyHash = masterKeyHash
    }

    preserveEntry(prev, next) {
      let options = prev.get()
      for (let o in options) {
        if (!next[o]) {
          next.set(o, options[o])
        }
      }
      return next
    }

    encryptData(data) {
      return _secrez.encrypt(data)
    }

    decryptData(encryptedData) {
      return _secrez.decrypt(encryptedData)
    }

    preEncryptData(data) {
      return _secrez.preEncrypt(data, undefined)
    }

    preDecryptData(encryptedData) {
      return _secrez.preDecrypt(encryptedData)
    }

    encryptSharedData(data, publicKey) {
      return _secrez.encryptShared(data, publicKey)
    }

    decryptSharedData(encryptedData, publicKey) {
      return _secrez.decryptShared(encryptedData, publicKey)
    }


    encryptEntry(entry) {

      if (!entry || entry.constructor.name !== 'Entry') {
        throw new Error('An Entry instance is expected as parameter')
      }

      const {
        type,
        name,
        content,
        preserveContent,
        id
      } = entry.get()

      if (this.masterKeyHash) {

        if (!ConfigUtils.isValidType(type)) {
          throw new Error('Unsupported type')
        }

        let ts = Crypto.getTimestampWithMicroseconds().join('.')
        let encryptedEntry = new Entry({
          id,
          type,
          ts
        })
        if (name) {
          let encryptedName = type + _secrez.encrypt(JSON.stringify({
            i: id,
            t: ts,
            n: name
          }))
          let extraName
          if (encryptedName.length > 255) {
            extraName = encryptedName.substring(254)
            encryptedName = encryptedName.substring(0, 254) + 'O'
          }

          encryptedEntry.set({
            encryptedName,
            extraName
          })

          if (preserveContent) {
            encryptedEntry = this.preserveEntry(entry, encryptedEntry)
          }

        }
        if (content) {
          encryptedEntry.set({
            encryptedContent: _secrez.encrypt(JSON.stringify({
              i: id,
              t: ts,
              c: content
            }))
          })
          if (preserveContent) {
            encryptedEntry = this.preserveEntry(entry, encryptedEntry)
          }
        }
        return encryptedEntry

      } else {
        throw new Error('User not logged')
      }
    }

    decryptEntry(encryptedEntry) {

      if (!encryptedEntry || encryptedEntry.constructor.name !== 'Entry') {
        throw new Error('An Entry instance is expected as parameter')
      }

      const {
        encryptedContent,
        extraName,
        encryptedName,
        preserveContent,
        nameId,
        nameTs
      } = encryptedEntry.get()

      if (this.masterKeyHash) {

        try {

          if (encryptedName) {
            let data = encryptedName
            if (extraName) {
              data = encryptedName.substring(0, 254) + extraName
            }
            let type = parseInt(data.substring(0, 1))
            let e = JSON.parse(_secrez.decrypt(data.substring(1)))
            let id = e.i
            let ts = e.t
            let name = e.n
            let content = ''

            // during the indexing internalFS reads only the names of the files
            if (encryptedContent) {
              let e = JSON.parse(_secrez.decrypt(encryptedContent))
              if (id !== e.i || ts !== e.t) {
                throw new Error('Data is corrupted')
              }
              content = e.c
            }

            let decryptedEntry = new Entry({
              id,
              type,
              ts,
              name,
              content
            })

            if (preserveContent) {
              decryptedEntry = this.preserveEntry(encryptedEntry, decryptedEntry)
            }

            return decryptedEntry
          }

          // when the encryptedName has been already decrypted and we need only the content
          if (encryptedContent) {
            let e = JSON.parse(_secrez.decrypt(encryptedContent))

            if ((nameId && e.i !== nameId) || (nameTs && e.t !== nameTs)) {
              throw new Error('Content is corrupted')
            }

            let decryptedEntry = new Entry({
              id: e.i,
              ts: e.i,
              content: e.c
            })

            if (preserveContent) {
              decryptedEntry = this.preserveEntry(encryptedEntry, decryptedEntry)
            }

            return decryptedEntry
          }

        } catch (e) {
          if (e.message === 'Data is corrupted') {
            throw e
          } else if (e.message === 'Content is corrupted') {
            throw e
          }
          throw new Error('Fatal error during decryption')
        }

        throw new Error('Missing parameters')
      } else {
        throw new Error('User not logged')
      }
    }

    signout() {
      if (this.masterKeyHash) {
        delete this.masterKeyHash
        _secrez = undefined
      } else {
        throw new Error('User not logged')
      }
    }

  }

  return Secrez

}

