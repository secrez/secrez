class Lpwd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lpwd = {}
    this.cliConfig.completion.help.lpwd = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Shows the path of the external working directory.',
        'Secrez refers to external when refers to unencrypted standard files in the OS.'
      ],
      examples: [
        'lpwd'
      ]
    }
  }

  async lpwd() {
    return this.cliConfig.localWorkingDir
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      this.Logger.reset(await this.lpwd())
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Lpwd


