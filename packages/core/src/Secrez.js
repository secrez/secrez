const homedir = require('homedir')
const fs = require('fs-extra')
const Crypto = require('./utils/Crypto')
const config = require('./config')
const ConfigUtils = require('./config/ConfigUtils')
const Entry = require('./Entry')
const utils = require('./utils')
const bs58 = require('bs58')

class _Secrez {

  constructor(masterKey) {
    this.masterKey = masterKey
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

  async signup(password, iterations) {
    if (!this.config || !this.config.keysPath) {
      throw new Error('Secrez not initiated')
    }
    if (!await fs.pathExists(this.config.keysPath)) {

      let id = Crypto.b58Hash(Crypto.generateKey())

      let derivedPassword = await this.derivePassword(password, iterations)
      _secrez = new _Secrez(Crypto.generateKey())
      let key = Crypto.encrypt(_secrez.masterKey, derivedPassword)
      let hash = this.masterKeyHash = Crypto.b58Hash(_secrez.masterKey)

      // x25519-xsalsa20-poly1305
      const boxPair = Crypto.generateBoxKeyPair()
      const box = {
        secretKey: Crypto.encrypt(Crypto.toBase58(boxPair.secretKey), _secrez.masterKey),
        publicKey: Crypto.toBase58(boxPair.publicKey)
      }

      // ed25519
      const ed25519Pair = Crypto.generateSignatureKeyPair()
      const sign = {
        secretKey: Crypto.encrypt(Crypto.toBase58(ed25519Pair.secretKey), _secrez.masterKey),
        publicKey: Crypto.toBase58(ed25519Pair.publicKey)
      }

      const when = utils.intToBase58(Date.now())
      const data = this.sortObj({
        id,
        sign,
        box,
        when,
        key,
        hash
      })

      const signature = Crypto.getSignature(JSON.stringify(data), ed25519Pair.secretKey)
      const conf = {
        data,
        signature
      }
      await fs.writeFile(this.config.keysPath, JSON.stringify(conf))
    } else {
      throw new Error('An account already exists. Please, sign in or chose a different container directory')
    }
  }

  async saveIterations(iterations) {
    const env = await ConfigUtils.getEnv()
    env.iterations = iterations
    await ConfigUtils.putEnv(env)
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
    if (await fs.pathExists(this.config.keysPath)) {
      let {key, hash} = JSON.parse(await fs.readFile(this.config.keysPath, 'utf8')).data
      let derivedPassword = await this.derivePassword(password, iterations)
      let masterKey
      try {
        masterKey = await Crypto.decrypt(key, derivedPassword)
      } catch (e) {
        throw new Error('Wrong password or wrong number of iterations')
      }
      if (utils.secureCompare(Crypto.b58Hash(masterKey), hash)) {
        _secrez = new _Secrez(masterKey)
        this.masterKeyHash = hash
      } else {
        throw new Error('Hash on file does not match the master key')
      }
    } else {
      throw new Error('Account not set yet')
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
    let encryptedData = Crypto.encrypt(
        data,
        _secrez.masterKey
    )
    return encryptedData
  }

  decryptData(encryptedData) {
    let data = Crypto.decrypt(
        encryptedData,
        _secrez.masterKey
    )
    return data
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
        let encryptedName = type + Crypto.encrypt(JSON.stringify({
              i: id,
              t: ts,
              n: name
            }),
            _secrez.masterKey
        )
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
          encryptedContent: Crypto.encrypt(JSON.stringify({
                i: id,
                t: ts,
                c: content
              }),
              _secrez.masterKey
          )
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
          let e = JSON.parse(Crypto.decrypt(data.substring(1), _secrez.masterKey))
          let id = e.i
          let ts = e.t
          let name = e.n
          let content = ''

          // during the indexing internalFS reads only the names of the files
          if (encryptedContent) {
            let e = JSON.parse(Crypto.decrypt(encryptedContent, _secrez.masterKey))
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
          // let [id, ts, content] = decrypt(encryptedContent, _secrez.masterKey)
          let e = JSON.parse(Crypto.decrypt(encryptedContent, _secrez.masterKey))

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
