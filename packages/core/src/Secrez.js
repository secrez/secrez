const homedir = require('homedir')
const fs = require('fs-extra')
const Crypto = require('./utils/Crypto')
const config = require('./config')
const utils = require('./utils')
const bs58 = require('bs58')
const PrivateKeyGenerator = require('./utils/PrivateKeyGenerator')

class Secrez {

  constructor() {
    this.types = {
      INDEX: 0,
      DIR: 1,
      FILE: 2
    }
  }

  isSupportedType(type) {
    type = parseInt(type)
    for (let t in this.types) {
      if (this.types[t] === type) {
        return true
      }
    }
    return false
  }

  async init(
      container = `${homedir()}/.secrez`,
      localWorkingDir = homedir()
  ) {
    await config.setSecrez(container, localWorkingDir)
    this.config = config
  }

  async derivePassword(password, iterations) {
    password = Crypto.SHA3(password)
    const salt = Crypto.SHA3(password)
    return bs58.encode(Crypto.deriveKey(password, salt, iterations, 32))
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

  async signup(password, iterations, saveIterations) {
    if (!this.config || !this.config.secrez.confPath) {
      throw new Error('Secrez not initiated')
    }
    if (!fs.existsSync(this.config.secrez.confPath)) {

      let id = Crypto.b58Hash(Crypto.generateKey())

      let derivedPassword = await this.derivePassword(password, iterations)
      this.masterKey = Crypto.generateKey()
      let key = Crypto.encrypt(this.masterKey, derivedPassword)
      let hash = Crypto.b58Hash(this.masterKey)

      // x25519-xsalsa20-poly1305
      const boxPair = Crypto.generateBoxKeyPair()
      const box = {
        secretKey: Crypto.encrypt(Crypto.toBase58(boxPair.secretKey), this.masterKey),
        publicKey: Crypto.toBase58(boxPair.publicKey)
      }

      // ed25519
      const ed25519Pair = Crypto.generateSignatureKeyPair()
      const sign = {
        secretKey: Crypto.encrypt(Crypto.toBase58(ed25519Pair.secretKey), this.masterKey),
        publicKey: Crypto.toBase58(ed25519Pair.publicKey)
      }

      // secp256k1
      const account = await PrivateKeyGenerator.generate({accounts: 1})
      account.mnemonic = Crypto.encrypt(account.mnemonic, this.masterKey)
      account.privateKey = Crypto.encrypt(account.privateKeys[0], this.masterKey)
      account.hdPath = Crypto.toBase58(account.hdPath)
      delete account.privateKeys
      const when = utils.intToBase58(Date.now())
      const data = this.sortObj({
        id,
        sign,
        box,
        when,
        key,
        account,
        hash
      })

      const signature = Crypto.getSignature(JSON.stringify(data), ed25519Pair.secretKey)
      const conf = {
        data,
        signature
      }
      await fs.writeFile(this.config.secrez.confPath, JSON.stringify(conf))
      if (saveIterations) {
        await fs.writeFile(this.config.secrez.envPath, JSON.stringify({iterations}))
      }
    } else {
      throw new Error('An account already exists. Please, sign in or chose a different container directory')
    }
  }

  async signin(password, iterations) {
    if (!this.config || !this.config.secrez.confPath) {
      throw new Error('Secrez not initiated')
    }
    if (!iterations) {
      if (fs.existsSync(this.config.secrez.envPath)) {
        let env = JSON.parse(await fs.readFile(this.config.secrez.envPath, 'utf8'))
        iterations = env.iterations
      }
    }
    if (!iterations || iterations !== parseInt(iterations.toString())) {
      throw new Error('Iterations is missed')
    }
    iterations = parseInt(iterations)
    if (await fs.existsSync(this.config.secrez.confPath)) {
      let {key, hash} = JSON.parse(await fs.readFile(this.config.secrez.confPath, 'utf8')).data
      let derivedPassword = await this.derivePassword(password, iterations)
      let masterKey
      try {
        masterKey = await Crypto.decrypt(key, derivedPassword)
      } catch (e) {
        throw new Error('Wrong password or wrong number of iterations')
      }
      if (utils.secureCompare(Crypto.b58Hash(masterKey), hash)) {
        this.masterKey = masterKey
      } else {
        throw new Error('Hash on file does not match the master key')
      }
    } else {
      throw new Error('Account not set yet')
    }
  }

  encryptItem(id, type, name, content, preserveContent) {

    if (typeof id === 'object') {
      type = id.type
      name = id.name
      content = id.content
      preserveContent = id.preserveContent
      id = id.id
    }

    if (this.masterKey) {

      if (!this.isSupportedType(type)) {
        throw new Error('Unsupported type')
      }

      let scrambledTs = Crypto.scrambledTimestamp()
      let separator = Crypto.randomCharNotInBase58()
      let result = {
        id,
        type,
        scrambledTs,
        encryptedName: type + Crypto.encrypt(id + scrambledTs + separator + name, this.masterKey),
        encryptedContent: content ? Crypto.encrypt(id + scrambledTs + separator + content, this.masterKey) : ''
      }
      if (result.encryptedName.length > 255) {
        result.extraName = result.encryptedName.substring(254)
        result.encryptedName = result.encryptedName.substring(0, 254) + 'O'
      }
      if (preserveContent) {
        result.name = name
        result.content = content
      }
      return result
    } else {
      throw new Error('User not logged')
    }
  }

  decryptItem(encryptedName, encryptedContent, extraName) {

    if (typeof encryptedName === 'object') {
      encryptedContent = encryptedName.encryptedContent
      extraName = encryptedName.extraName
      encryptedName = encryptedName.encryptedName
    }

    function decrypt(data, key) {
      let dec = Crypto.decrypt(data, key)
      let id = dec.substring(0, 4)
      let ts = ''
      for (let i = 4; i < dec.length; i++) {
        let c = dec[i]
        if (Crypto.isCharNotInBase58(c)) {
          data = dec.substring(i + 1)
          break
        }
        ts += c
      }
      return [id, Crypto.unscrambleTimestamp(ts), data]
    }

    if (this.masterKey) {

      try {
        if (encryptedName) {
          if (extraName) {
            encryptedName = encryptedName.substring(0, 254) + extraName
          }
          let type = parseInt(encryptedName.substring(0, 1))
          let [id, ts, name] = decrypt(encryptedName.substring(1), this.masterKey)
          let content = ''

          // during the indexing internalFS reads only the names of the files
          if (encryptedContent) {
            let [id2, ts2, c] = decrypt(encryptedContent, this.masterKey)
            if (id !== id2 || ts !== ts2) {
              throw new Error('Data is corrupted')
            }
            content = c
          }

          return {
            id,
            type,
            ts,
            name,
            content
          }
        }

        // when the encryptedName has been already decrypted and we need only the content
        if (encryptedContent) {
          let [id, ts, content] = decrypt(encryptedContent, this.masterKey)

          return {
            id,
            ts,
            content
          }
        }
      } catch (err) {
        if (err.message === 'Data is corrupted') {
            throw err
        }
        throw new Error('Fatal error during decryption')
      }

      throw new Error('Missing parameters')
    } else {
      throw new Error('User not logged')
    }
  }

  signout() {
    if (this.masterKey) {
      delete this.masterKey
    } else {
      throw new Error('User not logged')
    }
  }

}

module.exports = Secrez
