
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
      description: ['Leaves either a room or the chat'],
      examples: [
        'quit'
      ]
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    if (this.prompt.environment.room) {
      this.prompt.environment.chatPrompt.onBeforeClose()
      await this.prompt.run()
    } else {
      /* istanbul ignore if  */
      if (process.env.NODE_ENV !== 'test') {
        await this.prompt.saveHistory()
      }
      delete this.prompt.environment.chatPrompt
      await this.prompt.environment.prompt.setSigintPosition()
    }
  }
}

module.exports = Quit


