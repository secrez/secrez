const cliConfig = require('../../src/cliConfig')
const Commands = require('../../src/commands')

class ChatPromptMock {

  async init(options) {
    this.secrez = options.secrez
    this.commands = (new Commands(this, cliConfig, 'chat')).getCommands()
    this.environment = options.environment
  }

  async run(options) {

  }

  async exec(cmds, noRun) {

  }

  async loading() {}
}

module.exports = ChatPromptMock

