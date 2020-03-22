class Cd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.cd = {
      _func: this.pseudoFileCompletion(this, this.cliConfig.onlyDir),
      _self: this
    }
    this.cliConfig.completion.help.cd = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String,
        defaultValue: '/'
      }
    ]
  }

  help() {
    return {
      description: ['Changes the working directory.'],
      examples: [
        'cd coin',
        'cd ../passwords',
        ['cd', 'moves to the root, like "cd /"'],
        ['cd ~', '~ is equivalent to /'],
      ]
    }
  }

  async exec(options = {}) {
    try {
      await this.prompt.internalFs.cd(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Cd


