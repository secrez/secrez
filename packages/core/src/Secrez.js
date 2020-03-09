const homedir = require('homedir')
const fs = require('fs-extra')
const Crypto = require('./utils/Crypto')
const config = require('./config')
const utils = require('./utils')
const bs58 = require('bs58')
const PrivateKeyGenerator = require('./utils/PrivateKeyGenerator')

class Secrez {

  async init(
      container = `${homedir()}/.secrez`,
      localWorkingDir = homedir()
  ) {
    await config.setSecrez(container, localWorkingDir)
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
    if (!config.secrez.confPath) {
      throw new Error('Secrez not initiated')
    }
    if (!fs.existsSync(config.secrez.confPath)) {

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
      await fs.writeFile(config.secrez.confPath, JSON.stringify(conf))
      if (saveIterations) {
        await fs.writeFile(config.secrez.envPath, JSON.stringify({iterations}))
      }
    } else {
      throw new Error('An account already exists. Please, sign in or chose a different container directory')
    }
  }

  async signin(password, iterations) {
    if (!config.secrez.confPath) {
      throw new Error('Secrez not initiated')
    }
    if (!iterations) {
      if (fs.existsSync(config.secrez.envPath)) {
        let env = JSON.parse(await fs.readFile(config.secrez.envPath, 'utf8'))
        iterations = env.iterations
      }
    }
    if (!iterations || iterations !== parseInt(iterations.toString())) {
      throw new Error('Iterations is missed')
    }
    iterations = parseInt(iterations)
    if (await fs.existsSync(config.secrez.confPath)) {
      let {key, hash} = JSON.parse(await fs.readFile(config.secrez.confPath, 'utf8')).data
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

  encryptItem(item, id = Crypto.getRandomId()) {
    item = Crypto.timestamp(true) + ' ' + item
    if (this.masterKey) {
      return [id, Crypto.encrypt(item, this.masterKey)].join('0')
    } else {
      throw new Error('User not logged')
    }
  }

  decryptItem(item) {
    if (this.masterKey) {
      let temp = item.split('0')
      item = temp[1] || temp[0]
      return Crypto.decrypt(item, this.masterKey)
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
