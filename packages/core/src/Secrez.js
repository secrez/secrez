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

  async signup(password, iterations, saveIterations) {
    if (!config.secrez.confPath) {
      throw new Error('Secrez not initiated')
    }
    if (!fs.existsSync(config.secrez.confPath)) {
      let derivedPassword = await this.derivePassword(password, iterations)
      this.masterKey = Crypto.generateKey() //SHA3(Crypto.getRandomString(256))
      let hash = Crypto.b58Hash(this.masterKey)
      const key = Crypto.encrypt(this.masterKey, derivedPassword)
      const pair = Crypto.generateKeyPair()
      const secret = this.encryptItem(Crypto.toBase58(pair.secretKey), derivedPassword)
      const generated = await PrivateKeyGenerator.generate({accounts: 1})
      const mnemonic = this.encryptItem(generated.mnemonic, derivedPassword)
      const wallet = this.encryptItem(generated.privateKeys[0], derivedPassword)
      const hdPath = Crypto.toBase58(generated.hdPath)
      const conf = {
        key,
        hash,
        mnemonic: [hdPath, mnemonic].join('0'),
        wallet,
        secret,
        public: Crypto.toBase58(pair.publicKey)
      }
      await fs.writeFile(config.secrez.confPath, JSON.stringify(conf))
      if (saveIterations) {
        await fs.writeFile(config.secrez.envPath, JSON.stringify({iterations}))
      }
    } else {
      throw new Error('An account already exists. Please, signin or chose a different container directory')
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
      let {key, hash} = JSON.parse(await fs.readFile(config.secrez.confPath, 'utf8'))
      let derivedPassword = await this.derivePassword(password, iterations)
      let masterKey
      try {
        masterKey = await Crypto.decrypt(key, derivedPassword)
      } catch(e) {
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

  encryptItem(item) {
    if (this.masterKey) {
      return Crypto.encrypt(item, this.masterKey)
    } else {
      throw new Error('User not logged')
    }
  }

  decryptItem(item) {
    if (this.masterKey) {
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
