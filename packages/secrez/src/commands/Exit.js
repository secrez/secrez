const {Utils} = require('@secrez/core')

class Exit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.exit = Utils.sortKeys({
      // dontSaveHistory: TRUE // not supported, yet
    })
    this.cliConfig.completion.help.exit = true
  }

  help() {
    return {
      description: ['Exits TGT.'],
      examples: [
        'exit',
        'exit dontSaveHistory'
      ]
    }
  }

  async exec(options = {}) {
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


