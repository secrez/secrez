const utils = require('@secrez/utils')

class Quit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.quit = utils.sortKeys({
      // dontSaveHistory: TRUE // not supported, yet
    })
    this.cliConfig.completion.help.quit = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }]
  }

  help() {
    return {
      description: ['Quits Secrez.'],
      examples: [
        'quit'
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

module.exports = Quit


