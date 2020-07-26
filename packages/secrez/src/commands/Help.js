const HelpProto = require('../utils/HelpProto')

class Help extends require('../Command') {

  constructor(prompt) {
    super(prompt)
    this.proto = new HelpProto({
      prompt: this.prompt,
      cliConfig: this.cliConfig,
      helpDescription: this.helpDescription,
      completions: this.completion
    })
  }

  setHelpAndCompletion() {
    this.optionDefinitions = [
      {
        name: 'command',
        alias: 'c',
        defaultOption: true,
        type: String
      }
    ]
  }

  help() {
    return this.proto.help()
  }

  async exec(options = {}) {
    let help
    let command = options.command
    if (command) {
      if (this.prompt.commands[command]) {
        help = this.prompt.commands[command].help()
      } else {
        this.Logger.red('Invalid command.')
        return await this.prompt.run()
      }
    } else {
      help = this.help()
    }
    this.proto.format(help, command)
    await this.prompt.run()
  }
}

module.exports = Help


