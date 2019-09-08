// const path = require('path')
// const fs = require('../utils/fs')
// const _ = require('lodash')

class Mkdir extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.mkdir = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.mkdir = true
    this.optionDefinitions = [
      {
        name: 'directory',
        alias: 'd',
        defaultOption: true,
        type: String
      },
      {
        name: 'parents',
        alias: 'p',
        type: Boolean
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
    if (!options.directory) {
      this.Logger.red('Directory name not specified.')
    } else {
      const msg = await this.prompt.fileSystem.mkdir(options.directory, options.parents)
      this.Logger.black(msg)
    }
    this.prompt.run()
  }
}

module.exports = Mkdir


