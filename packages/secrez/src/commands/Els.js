
class Els extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.els = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.els = true
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
      description: ['Browses the external directories.',
        'Secrez refers to external when refers to unencrypted standard files in the OS.'
      ],
      examples: [
        'els coin',
        'els ../passwords',
        'els ~'
      ]
    }
  }

  async exec(options) {
    let list = await this.prompt.externalFileSystem.els(options.path)
    if (list) {
      if (list.length) {
        this.Logger.dim(options.list
            ? list.join('\n')
            : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
        )
      }
    } else {
      this.Logger.dim(`els: ${options.path}: No such file or directory`)
    }
    this.prompt.run()
  }
}

module.exports = Els



