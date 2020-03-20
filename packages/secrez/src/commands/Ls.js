class Ls extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ls = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.config.completion.help.ls = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Browses the directories.'],
      examples: [
        'ls coin',
        'ls ../passwords',
        'ls ~'
      ]
    }
  }

  async exec(options) {
    try {
      let list = await this.prompt.internalFs.ls(options, this.pseudoFileCompletion(options.path))
      if (list) {
        if (list.length) {
          this.Logger.reset(options.list
              ? list.join('\n')
              : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
          )
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Ls


