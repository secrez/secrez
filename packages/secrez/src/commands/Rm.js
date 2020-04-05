const {config, Entry} = require('@secrez/core')

class Rm extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.rm = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.rm = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'version',
        alias: 'v',
        multiple: true,
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Removes a file or a single version of a file.',
        'Since in Secrez files are immutable, the file is not deleted,',
        'it is just marked as deleted and not shown anymore in the tree.'
      ],
      examples: [
        'rm secret1',
        'rm secret2 -v 9Gcp,8hYU'
      ]
    }
  }

  async rm(options) {
    return await this.internalFs.remove(options)
  }

  formatResult(item) {
    return [item.id, item.version, item.name].join('     ')
  }

  async exec(options) {
    if (!options.path) {
      this.Logger.red('File path not specified.')
    } else {
      try {
        let deleted = await this.rm(options)
        this.Logger.yellow('Deleted entries:')
        this.Logger.grey(deleted.map(e => this.formatResult(e)).join('\n'))
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Rm


