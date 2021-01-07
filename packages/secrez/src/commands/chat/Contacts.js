
class Contacts extends require('../../Command') {

  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.contacts = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.chatCompletion.help.contacts = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean,
        default: true
      },
      {
        name: 'add',
        alias: 'a',
        type: String
      },
      {
        name: 'update',
        alias: 'u',
        type: String
      },
      {
        name: 'delete',
        alias: 'd',
        type: String
      },
      {
        name: 'rename',
        alias: 'r',
        type: String,
        multiple: true
      },
      {
        name: 'show',
        alias: 's',
        type: String
      }
    ]
  }

  help() {
    return this.prompt.environment.prompt.commands.contacts.help()
  }

  async customCompletion(options, originalLine, defaultOption) {
    return []
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!Object.keys(options).length) {
        options.list = true
      }
      this.validate(options)
      let result = await this.prompt.environment.prompt.commands.contacts.contacts(options)
      if (!Array.isArray(result)) {
        result = [result]
      }
      for (let r of result) {
        this.Logger.reset(r)
      }

    } catch (e) {
      // console.log(e)
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Contacts


