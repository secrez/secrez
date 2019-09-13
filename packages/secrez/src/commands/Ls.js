class Ls extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ls = {
      _func: this.pseudoFileCompletion(this)
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
    let list = await this.prompt.internalFileSystem.ls(options.path)
    if (list) {
      if (list.length) {
        this.Logger.dim(options.list
        ? list.join('\n')
        : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
        )
      }
    } else {
      this.Logger.dim(`ls: ${options.path}: No such file or directory`)
    }
    this.prompt.run()
  }
}

module.exports = Ls


