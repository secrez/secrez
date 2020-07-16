const utils = require('@secrez/utils')

class Exit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.exit = utils.sortKeys({
      // dontSaveHistory: TRUE // not supported, yet
    })
    this.cliConfig.completion.help.exit = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }]
  }

  help() {
    return {
      description: ['Exits Secrez.'],
      examples: [
        'exit',
        'exit dontSaveHistory'
      ]
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    this.Logger.reset('Bye bye :o)')
    /* istanbul ignore if  */
    // eslint-disable-next-line no-constant-condition
    if (!options.testing) {
      await this.prompt.saveHistory()
      /*eslint-disable-next-line*/
      process.exit(0)
    }
  }
}

module.exports = Exit


