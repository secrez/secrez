class Els extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.els = {
      _func: this.fileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.els = true
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
    try {
      let list = await this.prompt.externalFs.ls(options.path)
      if (list) {
        if (list.length) {
          this.Logger.reset(options.list
              ? list.join('\n')
              : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
          )
        }
      } else {
        this.Logger.reset(`els: ${options.path}: No such file or directory`)
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Els



