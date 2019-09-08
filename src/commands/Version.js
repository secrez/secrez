const pkg = require('../../package')

class Version extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.version = {}
    this.config.completion.help.version = true
  }

  help() {
    return {
      description: ['Shows the version of Secrez.'],
      examples: [
        'version'
      ]
    }
  }

  async exec() {
    this.Logger.black(`v${pkg.version}`)
    this.prompt.run()
  }
}

module.exports = Version


