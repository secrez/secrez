class Epwd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.epwd = {}
    this.config.completion.help.epwd = true
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
      this.Logger.log(`${this.config.localWorkingDir}`)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Epwd


