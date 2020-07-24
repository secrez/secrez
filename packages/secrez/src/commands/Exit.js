const utils = require('@secrez/utils')

class Exit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.exit = utils.sortKeys({
      // dontSaveHistory: TRUE // not supported, yet
    })
    this.cliConfig.completion.help.exit = true
    this.optionDefinitions = []
  }

  help() {
    return {
      description: ['<< deprecated - use "quit" instead'],
      examples: []
    }
  }

  async exec(options = {}) {
    this.Logger.red('Exit is deprecated. Use "quit" instead')
    await this.prompt.run()
  }
}

module.exports = Exit


