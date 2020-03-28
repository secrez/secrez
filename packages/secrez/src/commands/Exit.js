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

  async exec() {
    await this.prompt.saveHistory()
    this.Logger.reset('Bye bye :o)')
    /*eslint-disable-next-line*/
    process.exit(0)
  }
}

module.exports = Exit


