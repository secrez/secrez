class Quit extends require('../../Command') {

  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.quit = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.chatCompletion.help.quit = true
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
      description: ['Quits the chat environment'],
      examples: [
        'quit'
      ]
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    /* istanbul ignore if  */
    if (process.env.NODE_ENV !== 'test') {
      await this.prompt.saveHistory()
      delete this.prompt.environment.chatPrompt
      await this.prompt.environment.prompt.setSigintPosition()
    } else {
      this.Logger.reset('Chat quit')
    }
  }
}

module.exports = Quit


