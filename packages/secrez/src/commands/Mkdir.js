const {config} = require('@secrez/core')

class Mkdir extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.mkdir = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.mkdir = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Creates a directory.'],
      examples: [
        'mkdir cryptos',
        'mkdir coin/tron/wallet',
        'mkdir ../other\\ people',
        'mkdir "super folder"'
      ]
    }
  }

  async exec(options) {
    if (!options.path) {
      this.Logger.red('Directory name not specified.')
    } else {
      try {
        options.type = config.types.DIR
        await this.prompt.internalFs.make(options)
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Mkdir


