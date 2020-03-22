const {config} = require('@secrez/core')

class Touch extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.touch = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.touch = true
    this.optionDefinitions = [
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

  async exec(options) {
    if (!options.path) {
      this.Logger.red('File path not specified.')
    } else {
      try {
        options.type = config.types.FILE
        await this.prompt.internalFs.make(options)
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Touch


