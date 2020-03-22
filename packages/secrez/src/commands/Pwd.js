class Pwd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.pwd = {}
    this.cliConfig.completion.help.pwd = true
  }

  help() {
    return {
      description: ['Shows the path of the working directory.'],
      examples: [
        'pwd'
      ]
    }
  }

  async exec(options) {
    try {
      this.Logger.log(`${this.prompt.internalFs.tree.workingNode.getPath()}`)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Pwd


