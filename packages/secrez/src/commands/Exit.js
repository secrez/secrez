const {Utils} = require('secrez-core')

class Exit extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.exit = Utils.sortKeys({
      // dontSaveHistory: TRUE // not supported, yet
    })
    this.config.completion.help.exit = true
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
    this.Logger.reset('Bye bye :o)')
    /*eslint-disable-next-line*/
    process.exit(0)
  }
}

module.exports = Exit


