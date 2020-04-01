class Export extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.export = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.export = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        multiple: true,
        type: String,
        defaultValue: '.'
      },
      {
        name: 'clipboard',
        alias: 'c',
        type: Number
      }
    ]
  }

  help() {
    return {
      description: [
          'Export encrypted data to the OS in the current local folder',
          'Files and folders are decrypted during the process.'
      ],
      examples: [
        ['export seed.json', 'decrypts and copies seed.json to the disk'],
        ['export ethKeys -c 20', 'exports to the clipboard for 20 seconds']
      ]
    }
  }


  async export(options) {

  }

  async exec(options) {
    try {
      await this.export(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Export


