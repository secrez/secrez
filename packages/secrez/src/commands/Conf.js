const U2fClient = require('../U2fClient')
const _ = require('lodash')
const Case = require('case')
const {Crypto} = require('@secrez/core')

class Conf extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.conf = {
      _self: this
    }
    this.cliConfig.completion.help.conf = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'u2f',
        type: Boolean
      },
      {
        name: 'register',
        alias: 'r',
        type: String
      },
      {
        name: 'emergency-mnemonic',
        alias: 'e',
        type: Boolean
      },
      {
        name: 'force',
        alias: 'f',
        type: Boolean
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Configure a second factor using an U2F key'],
      examples: [
        ['conf --u2f -r solo','register a new key saving it as "solo";',
          'if there are registered keys, it will checks if the new one is one of them before adding it.'],
        ['conf -l', 'lists all factors'],
        ['conf -e', 'generates an emergency mnemonic to be used if all the factors are lost'],
        ['conf -ef', 'force the generation of a new emergency mnemonic']
      ]
    }
  }

  isEmergencyCodeSetUp() {
    const conf = this.secrez.getConf()
    if (conf.data.keys) {
      let keys = conf.data.keys
      for (let signer in keys) {
        if (keys[signer].type === this.secrez.config.sharedKeys.EMERGENCY_CODE) {
          return true
        }
      }
    }
  }

  async verifyIfAlreadyRegistered() {
    let client = this.u2fClient
    let list = client.list()
    for (let name of list) {
      try {
        let signatureData = await client.sign(name, `Touch the key to verify if it's ${name}...`)
        if (signatureData) {
          return name
        }
      } catch(e) {
      }
    }
    return false
  }

  async conf(options) {
    if (!this.u2fClient) {
      this.u2fClient = new U2fClient()
      await this.u2fClient.discover(this.secrez)
    }
    let client = this.u2fClient
    if (options.list) {
      let list = client.list()
      // this.Logger.reset('Registered keys:')
      this.Logger.reset(this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots()))
    } else if (options.emergencyMnemonic) {
      if (!client.list().length) {
        throw new Error('An emergency mnemonic can be set only if at least one security key has been registered.')
      }
      let conf = this.secrez.getConf()
      if (conf.data.keys.mnemonic && !options.force) {
        throw new Error('An emergency mnemonic has been already set. Use "-f" to override it.')
      }
      let mnemonic = Crypto.getMnemonic()
      let type = this.secrez.config.sharedKeys.EMERGENCY_CODE
      let signer = 'mnemonic'
      let parts = this.secrez.generateSharedSecrets(mnemonic)
      let sharedData = {
        parts,
        type,
        signer
      }
      await this.secrez.saveSharedSecrets(sharedData)
      await client.updateConf(this.secrez)
      let node = await this.prompt.commands.touch.touch({
        path: '.EMERGENCY_MNEMONIC',
        content: mnemonic,
        versionIfExists: true
      })
      this.Logger.reset(`An emergency mnemonic has been saved in ${node.getPath()}`)
      this.Logger.reset('When possible, "cat" it, save it in a safe place and remove the file.')
    } else if (options.u2F && options.register) {
      let signer = Case.snake(_.trim(options.register))
      if (signer === 'mnemonic') {
        throw new Error('The name "mnemonic" is reserver do the emergency mnemonic')
      }
      if (!options.register) {
        throw new Error('The nickname of the key is invalid')
      }
      let len = client.list().length
      let existentName
      if (len) {
        this.Logger.reset(`${len} key${len > 1 ? 's':''} already registered. Before registering a new one, must be sure that this is a new one.`)
        existentName = await this.verifyIfAlreadyRegistered()
      }
      if (existentName) {
        throw new Error(`This key is already registered as "${existentName}"`)
      }
      let registration = await client.register(signer, 'Touch the key to register...', true)
      let signatureData = await client.sign(registration, 'Touch the key to sign and verify...')
      if (signatureData) {
        let yes = await this.useConfirm({
          message: `Are you sure you want to use the key ${signer} as a second factor? If you loose it who could not be able to access you account anymore.`,
          default: false
        })
        if (yes) {
          let type = this.secrez.config.sharedKeys.UTF_KEY
          delete registration.certificate
          let parts = this.secrez.generateSharedSecrets(signatureData, {
            type,
            signer,
            registration
          })

          let sharedData = {
            parts,
            type,
            signer,
            registration
          }
          await this.secrez.saveSharedSecrets(sharedData)
          await client.updateConf(this.secrez)
          this.Logger.reset(`A second factor using ${signer} has been set.`)
          if (!this.isEmergencyCodeSetUp()) {
            let yes = await this.useConfirm({
              message: `An emergency mnemonic would allow you to recover the account if you loose ${signer}. Would you like to set it now?`,
              default: false
            })
            if (yes) {
              options.emergencyMnemonic = true
              return await this.conf(options)
            }
          }

        } else {
          throw new Error('Operation canceled')
        }
      } else {
        throw new Error('Invalid signature')
      }
    } else {
      throw new Error('Missing parameters. Run "conf -h" to see examples.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      console.log(options)

      await this.conf(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Conf


