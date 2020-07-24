const chalk = require('chalk')
const {ConfigUtils} = require('@secrez/core')
const clipboardy = require('clipboardy')

class Whoami extends require('../../Command') {

  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.whoami = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.chatCompletion.help.whoami = true
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
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.environment.prompt.commands.conf.preInit(options)
      if (options.ready) {
        this.Logger.reset(chalk.grey('Public key: ') + this.prompt.environment.secrez.getPublicKey())
        this.Logger.reset(chalk.grey('Hub url: ') + env.courier.tunnel.url)
        this.Logger.reset(chalk.grey('Hub & public key short url: ') + env.courier.tunnel.short_url)
        await clipboardy.write(env.courier.tunnel.short_url)
        this.Logger.grey('For your convenience, the short url has been copied to the clipboard.')
      }
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


