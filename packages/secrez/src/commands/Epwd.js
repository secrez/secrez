class Epwd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.epwd = {}
    this.cliConfig.completion.help.epwd = true
  }

  help() {
    return {
      description: ['Shows the path of the external working directory.',
        'Secrez refers to external when refers to unencrypted standard files in the OS.'
      ],
      examples: [
        'epwd'
      ]
    }
  }

  async exec() {
    try {
      this.Logger.log(`${this.prompt.secrez.config.localWorkingDir}`)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Epwd


