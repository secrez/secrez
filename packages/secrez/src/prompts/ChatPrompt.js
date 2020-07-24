const chalk = require('chalk')
const cliConfig = require('../cliConfig')
const Commands = require('../commands')
const Logger = require('../utils/Logger')

class ChatPrompt extends require('./CommandPrompt') {

  async init(options) {
    this.getReady({
      historyPath: options.historyPath,
      completion: 'chatCompletion',
      commands: (new Commands(this, cliConfig, 'chat')).getCommands(),
      environment: options.environment,
      secrez: options.secrez,
      context: 'chat'
    })
    await this.loadSavedHistory()
  }

  prePromptMessage(options = {}) {
    return chalk.reset(`Secrez/chat ${chalk.bold(
        this.environment.room
            ? '@' + this.environment.room.join('|')
            : '-'
    )}`)
  }

  async postRun(options = {}) {
    let cmd = options.cmd.split(' ')
    let command = cmd[0]
    if (this.environment.room && !/^\//.test(command)) {
      await this.exec([`send "${options.cmd.replace(/"/g, '\\"')}"`])
    } else {
      command = command.replace(/^\//, '')
      /* istanbul ignore if */
      if (!this.basicCommands.includes(command)) {
        Logger.red('Command not found')
        await this.run()
      } else {
        await this.exec([options.cmd.replace(/^\//, '')])
      }
    }
  }

}

module.exports = ChatPrompt


