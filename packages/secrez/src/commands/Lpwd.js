class Lpwd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lpwd = {}
    this.cliConfig.completion.help.lpwd = true
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
    return this.prompt.secrez.config.localWorkingDir
  }

  async exec() {
    try {
      this.Logger.reset(await this.lpwd())
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Lpwd


