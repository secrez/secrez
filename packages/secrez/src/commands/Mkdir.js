
class Mkdir extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.mkdir = {
      _func: this.pseudoFileCompletion(this)
    }
    this.config.completion.help.mkdir = true
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
      await this.prompt.internalFileSystem.mkdir(options.path)
    }
    this.prompt.run()
  }
}

module.exports = Mkdir


