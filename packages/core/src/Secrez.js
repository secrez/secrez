const homedir = require('homedir')
const fs = require('fs-extra')
const _ = require('lodash')
const Crypto = require('./Crypto')
const ConfigUtils = require('./config/ConfigUtils')
const Entry = require('./Entry')
const utils = require('@secrez/utils')

let globals = {}

module.exports = function (rand) {

  rand = rand.toString()
  const _Secrez = require('./_Secrez')(rand)

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
                 testDerivationVersion // to test the upgrade from 1 to 2
    ) {
      if (!this.config || !this.config.keysPath) {
        throw new Error('Secrez not initiated')
      }
      if (!await fs.pathExists(this.config.keysPath)) {

        let id = Crypto.b58Hash(Crypto.generateKey())
        globals[rand] = new _Secrez

        let derivationVersion = _Secrez.derivationVersion.TWO
        if (process.env.NODE_ENV === 'test' && testDerivationVersion) {
          derivationVersion = testDerivationVersion
        }

        await globals[rand].init(password, iterations, derivationVersion)

        let {key, hash} = await globals[rand].signup()
        this.masterKeyHash = hash

        // x25519-xsalsa20-poly1305
        const boxPair = Crypto.generateBoxKeyPair()
        const box = {
          secretKey: globals[rand].encrypt(Crypto.toBase58(boxPair.secretKey)),
          publicKey: Crypto.toBase58(boxPair.publicKey)
        }

        // ed25519
        const ed25519Pair = Crypto.generateSignatureKeyPair()
        const sign = {
          secretKey: globals[rand].encrypt(Crypto.toBase58(ed25519Pair.secretKey)),
          publicKey: Crypto.toBase58(ed25519Pair.publicKey)
        }

        globals[rand].initPrivateKeys(boxPair.secretKey, ed25519Pair.secretKey)

        const data = {
          id,
          sign,
          box,
          key,
          hash,
          when: utils.intToBase58(Date.now())
        }
        if (derivationVersion === _Secrez.derivationVersion.TWO) {
          data.derivationVersion = derivationVersion
        }
        globals[rand].setConf(await this.signAndSave(data), true)
      } else {
        throw new Error('An account already exists. Please, sign in or chose a different container directory')
      }
    }

    async derivePassword(password, iterations, derivationVersion) {
      return await _Secrez.derivePassword(password, iterations, derivationVersion)
    }

    async signAndSave(data) {
      const conf = globals[rand].signData(data)
      await fs.writeFile(this.config.keysPath, JSON.stringify(conf))
      return conf
    }

    async saveIterations(iterations) {
      const env = await ConfigUtils.getEnv(this.config)
      env.iterations = iterations
      await ConfigUtils.putEnv(this.config, env)
    }

    generateSharedSecrets(secret) {
      return globals[rand].generateSharedSecrets(secret)
    }

    async removeSharedSecret(authenticator, all) {
      let data = globals[rand].conf.data
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
        globals[rand].restoreKey()
      }
      let conf = await this.signAndSave(data)
      globals[rand].setConf(conf, true)
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
      globals[rand].setConf(conf, true)
      return conf
    }

    getConf() {
      return globals[rand].conf
    }

    getPublicKey() {
      return globals[rand].conf.data.box.publicKey + '0' + globals[rand].conf.data.sign.publicKey
    }

    static getSignPublicKey(publicKey) {
      return Crypto.fromBase58(publicKey.split('0')[1])
    }

    static getBoxPublicKey(publicKey) {
      return Crypto.fromBase58(publicKey.split('0')[0])
    }

    static isValidPublicKey(pk) {
      if (typeof pk === 'string') {
        const [boxPublicKey, signPublicKey] = pk.split('0').map(e => {
          e = Crypto.fromBase58(e)
          if (Crypto.isValidPublicKey(e)) {
            return e
          }
        })
        if (boxPublicKey && signPublicKey) {
          return true
        }
      }
      return false
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
      let data = await globals[rand].changePassword(password, iterations)
      globals[rand].setConf(await this.signAndSave(data), true)
    }

    verifyPassword(password) {
      return globals[rand].isItRight(password)
    }

    signMessage(message) {
      return globals[rand].signMessage(message)
    }

    verifySignedMessage(message, signature, publicKey) {
      return Crypto.verifySignature(message, signature, Crypto.fromBase58(publicKey || this.getConf().data.sign.publicKey))
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
      globals[rand] = new _Secrez
      await globals[rand].init(password, iterations, data.derivationVersion)
      /* istanbul ignore if  */
      if (!data.key && !data.keys) {
        throw new Error('No valid data found')
      }
      if (data.key) {
        let masterKeyHash = await globals[rand].signin(data)
        this.setMasterKeyHash(conf, masterKeyHash)
        if (!data.derivationVersion) {
          await this.upgradeAccount()
          return 1
        }
      } else {
        throw new Error('A second factor is required')
      }
      return 0
    }

    async getSecondFactorData(authenticator) {
      if (!this.config || !this.config.keysPath || !globals[rand] || !globals[rand].isInitiated()) {
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
      if (!this.config || !this.config.keysPath || !globals[rand] || !globals[rand].isInitiated()) {
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
      let masterKeyHash = await globals[rand].sharedSignin(data, authenticator, secret)
      this.setMasterKeyHash(conf, masterKeyHash)
      if (!data.derivationVersion) {
        await this.upgradeAccount()
        return 1
      }
      return 0
    }

    setMasterKeyHash(conf, masterKeyHash) {
      /* istanbul ignore if  */
      if (!globals[rand].setConf(conf)) {
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
      return globals[rand].encrypt(data)
    }

    decryptData(encryptedData) {
      return globals[rand].decrypt(encryptedData)
    }

    preEncryptData(data) {
      return globals[rand].preEncrypt(data)
    }

    preDecryptData(encryptedData) {
      return globals[rand].preDecrypt(encryptedData)
    }

    encryptSharedData(data, publicKey) {
      return globals[rand].encryptShared(data, publicKey)
    }

    decryptSharedData(encryptedData, publicKey) {
      return globals[rand].decryptShared(encryptedData, publicKey)
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
          let encryptedName = type + globals[rand].encrypt(JSON.stringify({
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
            encryptedContent: globals[rand].encrypt(JSON.stringify({
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
            let e = JSON.parse(globals[rand].decrypt(data.substring(1)))
            let id = e.i
            let ts = e.t
            let name = e.n
            let content = ''

            // during the indexing internalFS reads only the names of the files
            if (encryptedContent) {
              let e = JSON.parse(globals[rand].decrypt(encryptedContent))
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
            let e = JSON.parse(globals[rand].decrypt(encryptedContent))

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
        globals[rand] = undefined
      } else {
        throw new Error('User not logged')
      }
    }

  }

  return Secrez

}

