const U2fClient = require('../U2fClient')
const _ = require('lodash')
const Case = require('case')

class U2f extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.u2f = {
      _self: this
    }
    this.cliConfig.completion.help.u2f = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'register',
        alias: 'r',
        type: String
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
        ['u2f -r solo','register a new key saving it as "solo";',
          'if there are registered keys, it will checks if the new one is one of them before adding it.'],
        ['u2f -l', 'lists the registered keys']
      ]
    }
  }

  async verifyIfAlreadyRegistered() {
    let client = this.u2fClient
    for (let name of client.registrations) {
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

  async u2f(options) {
    if (!this.u2fClient) {
      this.u2fClient = new U2fClient()
      await this.u2fClient.discover()
    }
    let client = this.u2fClient
    if (options.register) {
      options.register = Case.snake(_.trim(options.register))
      if (!options.register) {
        throw new Error('The nickname of the key is invalid')
      }
      let len = Object.keys(client.registrations).length
      let existentName
      if (len) {
        this.Logger.reset(`${len} key${len > 1 ? 's':''} already registered. Before registering a new one, must be sure that this is a new one.`)
        existentName = await this.verifyIfAlreadyRegistered()
      }
      if (existentName) {
        throw new Error(`This key is already registered as "${existentName}"`)
      }
      let result = await client.register(options.register, 'Touch the key to register...', true)
      if (result === U2fClient.status.EXISTENT) {
        throw new Error('This key has been already registered.')
      }
      let signatureData = await client.sign(result, 'Touch the key to sign...')
      if (signatureData) {
        this.Logger.reset('Key successfully registered.')
        this.Logger.yellow('After logging out, you need this key to access this local account.')
      }
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!options.register && !options.list) {
        throw new Error('Invalid or missing parameters')
      }
      this.Logger.reset(await this.u2f(options))
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = U2f


