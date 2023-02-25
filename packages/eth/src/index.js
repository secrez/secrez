const Crypto = require('@secrez/crypto')
const {toChecksumAddress} = require('ethereumjs-util')
const ethers = require('ethers')
const bip39 = require('bip39')
const hdkey = require('hdkey')

class Eth {

  static newWallet() {
    return ethers.Wallet.createRandom()
  }

  static async getWalletFromMnemonic(mnemonic, derivedPath = "m/44'/60'/0'/0", walletListIndex) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const hdNode = hdkey.fromMasterSeed(seed)
    const privateKey = hdNode.derive(derivedPath).deriveChild(walletListIndex).privateKey.toString('hex')
    return Eth.getWalletFromPrivateKey(privateKey)
  }

  static async getWalletFromPrivateKey(privateKey) {
    return new ethers.Wallet(privateKey)
  }

  static async getWalletFromEncryptedJson(json, password) {
    return ethers.Wallet.fromEncryptedJson(json, password)
  }

  static async getAddressFromWallet(wallet) {
    return wallet.address
  }

  static equals(address1, address2) {
    return toChecksumAddress(address1) === toChecksumAddress(address2)
  }

}

module.exports = Eth
