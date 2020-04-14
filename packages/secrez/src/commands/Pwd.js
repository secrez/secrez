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

  async pwd() {
    return this.tree.workingNode.getPath()
  }

  async exec() {
    try {
      this.Logger.reset(await this.pwd())
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Pwd


