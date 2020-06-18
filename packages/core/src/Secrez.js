const homedir = require('homedir')
const _ = require('lodash')
const fs = require('fs-extra')
const Crypto = require('./utils/Crypto')
const config = require('./config')
const ConfigUtils = require('./config/ConfigUtils')
const Entry = require('./Entry')
const utils = require('./utils')
const bs58 = require('bs58')

class _Secrez {

  async init(password, iterations) {
    this.derivedPassword = await this.derivePassword(password, iterations)
  }

  async isInitiated() {
    return !!this.derivedPassword
  }

  async signup() {
    this.masterKey = Crypto.generateKey()
    let key = Crypto.encrypt(this.masterKey, this.derivedPassword)
    let hash = Crypto.b58Hash(this.masterKey)
    return {
      key,
      hash
    }
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
      this.masterKey = await Crypto.decrypt(data.key, this.derivedPassword)
      this.boxKey = Crypto.fromBase58(_secrez.decrypt(data.box.secretKey))
      this.signKey = Crypto.fromBase58(_secrez.decrypt(data.sign.secretKey))
    } catch (e) {
      throw new Error('Wrong password or wrong number of iterations')
    }
    if (utils.secureCompare(Crypto.b58Hash(this.masterKey), data.hash)) {
      return data.hash
    } else {
      throw new Error('Hash on file does not match the master key')
    }
  }

  async sharedSignin(data, signer, signature) {
    let key = data.keys[signer]
    try {
      let masterKey = this.recoverSharedSecrets(key.parts, signature)
      if (!utils.secureCompare(Crypto.b58Hash(masterKey), data.hash)) {
        throw new Error('Hash on file does not match the master key')
      }
      this.masterKey = masterKey
      this.boxKey = Crypto.fromBase58(_secrez.decrypt(data.box.secretKey))
      this.signKey = Crypto.fromBase58(_secrez.decrypt(data.sign.secretKey))
      return data.hash
    } catch (e) {
      throw new Error('Wrong data/signature')
    }
  }

  getEncryptedMasterKey() {
    if (!this.masterKey) {
        throw new Error('Master key not found')
    }
    if (!this.conf || !this.conf.data) {
      throw new Error('Data not loaded')
    }
    if (this.conf.data.key) {
      return this.conf.data.key
    } else {
      return Crypto.encrypt(this.masterKey, this.derivedPassword)
    }
  }

  async derivePassword(password, iterations) {
    password = Crypto.SHA3(password)
    const salt = Crypto.SHA3(password)
    return bs58.encode(Crypto.deriveKey(password, salt, iterations, 32))
  }

  encrypt(data) {
    return Crypto.encrypt(data, this.masterKey)
  }

  decrypt(encryptedData) {
    return Crypto.decrypt(encryptedData, this.masterKey)
  }

  encodeSignature(signature) {
    const encoded = bs58.encode(Buffer.from(Crypto.SHA3(signature)))
    console.log(encoded)
    return encoded
  }

  generateSharedSecrets(signature) {
    let parts = Crypto.splitSecret(this.masterKey, 2, 2)
    parts[1] = Crypto.encrypt(bs58.encode(Buffer.from(parts['1'])), this.derivedPassword)
    parts[2] = Crypto.encrypt(bs58.encode(Buffer.from(parts['2'])), this.encodeSignature(signature))
    return parts
  }

  recoverSharedSecrets(parts, signature) {
    parts = {
      1: new Uint8Array(bs58.decode(Crypto.decrypt(parts[1], this.derivedPassword))),
      2: new Uint8Array(bs58.decode(Crypto.decrypt(parts[2], this.encodeSignature(signature))))
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

let _secrez

class Secrez {

  constructor() {
    this.types = config.types
  }

  async init(
      container = `${homedir()}/.secrez`,
      localWorkingDir = homedir()
  ) {
    this.config = await ConfigUtils.setSecrez(config, container, localWorkingDir)
  }

  async derivePassword(password, iterations) {
    password = Crypto.SHA3(password)
    const salt = Crypto.SHA3(password)
    return bs58.encode(Crypto.deriveKey(password, salt, iterations, 32))
  }

  async signup(password, iterations) {
    if (!this.config || !this.config.keysPath) {
      throw new Error('Secrez not initiated')
    }
    if (!await fs.pathExists(this.config.keysPath)) {

      let id = Crypto.b58Hash(Crypto.generateKey())
      _secrez = new _Secrez
      await _secrez.init(password, iterations)

      let {key, hash} = await _secrez.signup()
      this.masterKeyHash = hash

      // x25519-xsalsa20-poly1305
      const boxPair = Crypto.generateBoxKeyPair()
      _secrez.boxKey = boxPair.secretKey
      const box = {
        secretKey: _secrez.encrypt(Crypto.toBase58(_secrez.boxKey)),
        publicKey: Crypto.toBase58(boxPair.publicKey)
      }

      // ed25519
      const ed25519Pair = Crypto.generateSignatureKeyPair()
      _secrez.signKey = ed25519Pair.secretKey
      const sign = {
        secretKey: _secrez.encrypt(Crypto.toBase58(_secrez.signKey)),
        publicKey: Crypto.toBase58(ed25519Pair.publicKey)
      }

      const data = {
        id,
        sign,
        box,
        key,
        hash,
        when: utils.intToBase58(Date.now())
      }
      _secrez.setConf(await this.signAndSave(data), true)
    } else {
      throw new Error('An account already exists. Please, sign in or chose a different container directory')
    }
  }

  async signAndSave(data) {
    const conf = _secrez.signData(data)
    await fs.writeFile(this.config.keysPath, JSON.stringify(conf))
    return conf
  }

  async saveIterations(iterations) {
    const env = await ConfigUtils.getEnv()
    env.iterations = iterations
    await ConfigUtils.putEnv(env)
  }

  generateSharedSecrets(signature) {
    return _secrez.generateSharedSecrets(signature)
  }

  async saveSharedSecrets(sharedData) {
    let conf = await this.readConf()
    if (!conf.data.keys) {
      conf.data.keys = {}
    }
    let signer = sharedData.signer
    delete sharedData.signer
    conf.data.keys[signer] = sharedData
    if (conf.data.key) {
      delete conf.data.key
    }
    conf = await this.signAndSave(conf.data)
    _secrez.setConf(conf, true)
    return conf
  }

  async removeSecondFactors() {
    let conf = _.clone(await this.readConf())
    conf.data.key = _secrez.getEncryptedMasterKey()
    delete conf.data.keys
    conf = await this.signAndSave(conf.data)
    _secrez.setConf(conf, true)
    return conf
  }

  getConf() {
    return _secrez.conf
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

  async signin(password, iterations) {
    if (!this.config || !this.config.keysPath) {
      throw new Error('Secrez not initiated')
    }
    if (!iterations) {
      const env = await ConfigUtils.getEnv()
      iterations = env.iterations
    }
    if (!iterations || iterations !== parseInt(iterations.toString())) {
      throw new Error('Iterations is missed')
    }
    iterations = parseInt(iterations)
    const conf = await this.readConf()
    const data = conf.data
    _secrez = new _Secrez
    await _secrez.init(password, iterations)
    if (data.key) {
      let masterKeyHash = await _secrez.signin(data)
      if (_secrez.setConf(conf)) {
        this.masterKeyHash = masterKeyHash
      } else {
        throw new Error('keys.json looks corrupted')
      }
    } else if (data.keys) {
      throw new Error('A second factor is required')
    } else {
      throw new Error('No valid data found')
    }
  }

  async getSecondFactorData(signer) {
    if (!this.config || !this.config.keysPath || !_secrez || !_secrez.isInitiated()) {
      throw new Error('A standard sign in must be run before to initiate Secrez')
    }
    const conf = await this.readConf()
    let data = conf.data.keys[signer]
    if (data) {
      return data
    } else {
      throw new Error(`No registered data with the signer ${signer}`)
    }
  }

  async sharedSignin(signer, signatureData) {
    if (!this.config || !this.config.keysPath || !_secrez || !_secrez.isInitiated()) {
      throw new Error('A standard sign in must be run before to initiate Secrez')
    }
    const conf = await this.readConf()
    const data = conf.data
    if (!data.keys) {
      throw new Error('No second factor registered')
    } else if (!data.keys[signer]) {
      throw new Error(`No second factor registered with the signer ${signer}`)
    }
    let masterKeyHash = await _secrez.sharedSignin(data, signer, signatureData)
    if (_secrez.setConf(conf)) {
      this.masterKeyHash = masterKeyHash
    } else {
      throw new Error('keys.json looks corrupted')
    }
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

module.exports = Secrez
