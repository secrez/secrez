const seedrandom = require('seedrandom')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

class PrivateKeyGenerator {

  static randomBytes(length = 8, rng = Math.random) {
    let buf = []
    for (let i = 0; i < length; i++) {
      buf.push(rng() * 255)
    }
    return Buffer.from(buf)
  }

  static randomAlphaNumericString(length = 8, rng = Math.random) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let text = ''
    for (let i = 0; i < length; i++) {
      text += alphabet.charAt(Math.floor(rng() * alphabet.length))
    }
    return text
  }

  static async generate(options = {}) {
    const thiz = PrivateKeyGenerator
    const hdPath = options.hdPath || "m/44'/60'/0'/0/"
    const mnemonic = options.mnemonic || bip39.entropyToMnemonic(thiz.randomBytes(16, seedrandom(thiz.randomAlphaNumericString(10, seedrandom()))).toString('hex'))
    const wallet = hdkey.fromMasterSeed(await bip39.mnemonicToSeed(mnemonic))
    const privateKeys = []
    for (let i = options.startFrom || 0; i < (options.accounts || 1); i++) {
      let acct = wallet.derivePath(hdPath + i)
      let privateKey = acct.getWallet().getPrivateKey().toString('hex')
      privateKeys.push(privateKey)
    }
    return {
      hdPath,
      mnemonic,
      privateKeys
    }
  }

}


module.exports = PrivateKeyGenerator
