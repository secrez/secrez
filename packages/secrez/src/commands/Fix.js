class Fix extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.fix = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.fix = true
    this.optionDefinitions = []
  }

  help() {
    return {
      description: [
        'Fixes the tree.',
        'The tree can miss some files if you change the data and push it from two different sources, because only the most recent tree is loaded at start.',
        'Fix recovers missing files reading the less recent trees.',
        'It should never happen, but if all the indexes are lost, it puts everything in the root.'
      ],
      examples: [
        'fix'
      ]
    }
  }

  async fix(options) {
    return await this.internalFs.fixTree(options)
  }

  async exec(options = {}) {
    try {
      let result = await this.fix(options)
      this.Logger.reset(result.length ? result.join('\n') : 'Nothing to fix here.')
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Fix


