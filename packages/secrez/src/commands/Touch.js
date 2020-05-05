const {config, Entry} = require('@secrez/core')

class Touch extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.touch = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.touch = true
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
      },
      {
        name: 'content',
        alias: 'c',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Creates a file.',
        'Compared with Unix "touch" command, it can create a file with content',
        'Check also "help create" for more options.'
      ],
      examples: [
        'touch somefile',
        'touch -p afile --content "Password: 1432874565"',
        'touch ether -c "Private Key: eweiu34y23h4y23ih4uy23hiu4y234i23y4iuh3"',
      ]
    }
  }

  async touch(options) {
    let sanitizedPath = Entry.sanitizePath(options.path)
    if (sanitizedPath !== options.path) {
      throw new Error('A filename cannot contain \\/><|:&?* chars.')
    }
    options.type = config.types.TEXT
    return await this.internalFs.make(options)
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    if (!options.path) {
      this.Logger.red('File path not specified.')
    } else {
      try {
        await this.touch(options)
        this.Logger.grey(`New file "${options.path}" created.`)
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Touch


