const _ = require('lodash')
const {chalk} = require('../utils/Logger')
const path = require('path')
const {config} = require('@secrez/core')
const Crypto = require('@secrez/crypto')
const {Node} = require('@secrez/fs')
const {isYaml, yamlParse} = require('@secrez/utils')
const pkg = require('../../package')

class Wallet extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.wallet = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.wallet = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'path',
        completionType: 'file',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'field',
        alias: 'f',
        type: String
      },
      {
        name: 'create',
        alias: 'c',
        type: Boolean
      },
      {
        name: 'overwrite',
        alias: 'o',
        type: Boolean
      },
      {
        name: 'append',
        alias: 'a',
        type: Boolean
      },
      {
        name: 'export',
        alias: 'e',
        type: String
      },
      {
        name: 'export-keystore',
        alias: 'k',
        type: String
      }
    ]
  }

  // const wallet = new ethers.Wallet(privateKey);
  // const encryptedJson = await ethers.utils.encryptKeystoreJson(wallet.privateKey, password);

  help() {
    return {
      description: ['Handle Ethereum-compatible wallets.',
      'It manages the fields wallet_pk and wallet_a in any yaml card.'
      ],
      examples: [
        ['wallet -cp new-wallet.yml', 'creates a new wallet and saves it in the file new-wallet.yml'],
        ['wallet -p defi.yml -e ~/Desktop/encWallet.txt', 'exports the default wallet in the file defi.yml, if exists, to the file encWallet.txt. If file encWallet.txt and extra options (-o or -a) is required.'],
        ['wallet -p defi.yml -ok ~/Desktop/encWallet', 'exports the default wallet in the encrypted keystore file "encWallet.json", overwriting an existing file.'],
      ]
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    this.Logger.reset(`v${pkg.version}`)
    await this.prompt.run()
  }
}

module.exports = Wallet


