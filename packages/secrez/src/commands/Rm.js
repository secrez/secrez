const chalk = require('chalk')

class Rm extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.rm = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.rm = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
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
      description: ['Removes one or more files and folders.',
        'Technically files are moved to the trash dataset (access it with "use trash").',
        'If you remove a file from the trash dataset, the data will be deleted from disk;',
        'this action is not undoable.'
      ],
      examples: [
        'rm secret1'
      ]
    }
  }

  async rm(options = {}) {
    options.asIs = true
    options.newPath = 'trash:/'
    options.removing = true

    let nodes = await this.internalFs.fileList(options, null, true)
    let deleted = nodes.map(n => n.getPath())
    if (deleted.length) {
      await this.prompt.commands.mv.mv(options, nodes)
    }
    return deleted
  }

  formatResult(item) {
    return [chalk.yellow(item.version), item.name].join(' ')
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    if (!options.path) {
      this.Logger.red('File path not specified.')
    } else {
      try {
        this.validate(options)
        let deleted = await this.rm(options)
        if (deleted.length === 0) {
          this.Logger.grey('No files have been deleted.')
        } else {
          this.Logger.grey('Deleted entries:')
          for (let d of deleted) {
            this.Logger.reset(d)
          }
        }
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Rm


