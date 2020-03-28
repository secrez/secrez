const pkg = require('../../package')

class Ver extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.ver = {}
    this.cliConfig.completion.help.ver = true
  }

  help() {
    return {
      description: ['Shows the version of Secrez.'],
      examples: [
        'ver'
      ]
    }
  }

  async exec() {
    this.Logger.reset(`v${pkg.version}`)
    this.prompt.run()
  }
}

module.exports = Ver


