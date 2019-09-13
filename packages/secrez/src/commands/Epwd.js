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
    this.Logger.log(`${this.config.localWorkingDir}`)
    this.prompt.run()
  }
}

module.exports = Epwd


