const utils = require('@secrez/utils')

class Bash extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.bash = utils.sortKeys({
    })
    this.cliConfig.completion.help.bash = true
    this.optionDefinitions = []
  }

  help() {
    return {
      description: ['<< deprecated - use "shell" instead'],
      examples: []
    }
  }

  async exec(options = {}) {
    this.Logger.red('"bash" is deprecated. Use "shell" instead')
    await this.prompt.run()
  }
}

module.exports = Bash
