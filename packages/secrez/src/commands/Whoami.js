const chalk = require('chalk')
const {ConfigUtils} = require('@secrez/core')
const clipboardy = require('clipboardy')

class Whoami extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.whoami = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.whoami = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Show data that other users need to chat with you'],
      examples: [
        'whoami'
      ]
    }
  }

  async customCompletion(options, originalLine, defaultOption) {
    return []
  }

  async whoami(options) {
    let result = {
      publicKey: this.secrez.getPublicKey()
    }
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.commands.courier.preInit(options)
      if (options.ready) {
        result.url = env.courier.tunnel.url
      }
    }
    if (options.asIs) {
      return result
    }
    this.Logger.reset(chalk.grey('Public key: ') + result.publicKey)
    if (result.url) {
      this.Logger.reset(chalk.grey('Hub url: ') + result.url)
      await clipboardy.write(result.url)
      this.Logger.grey('For your convenience, the url has been copied to the clipboard.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      await this.whoami(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Whoami


