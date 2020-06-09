class Pwd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.pwd = {}
    this.cliConfig.completion.help.pwd = true
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
      description: ['Shows the path of the working directory.'],
      examples: [
        'pwd'
      ]
    }
  }

  async pwd() {
    return this.internalFs.tree.workingNode.getPath()
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.Logger.reset(await this.pwd())
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Pwd


