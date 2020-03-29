class Import extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.import = {
      _func: this.fileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.import = true
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
        name: 'move',
        alias: 'm',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: [
          'Import files and folders from the OS in the current folder',
          'Files and folders are encrypted during the process.'
      ],
      examples: [
        ['import seed.json', 'copies seed.json from the disk into the current directory'],
        ['import --move ethKeys', 'copies ethKeys and remove it from the disk'],
        ['import -p ~/passwords', 'imports the entire folder passwords']
      ]
    }
  }

  async exec(options) {
    try {
      await this.prompt.crossFs.import(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Import


