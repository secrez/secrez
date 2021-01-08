
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
    return this.prompt.environment.prompt.commands.whoami.help()
  }

  async customCompletion(options, originalLine, defaultOption) {
    return []
  }

  async whoami(options) {
    return await this.prompt.environment.prompt.commands.whoami.whoami(options)
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


