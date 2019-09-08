
class Ls extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ls = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.ls = true
    this.optionDefinitions = [
      {
        name: 'files',
        alias: 'f',
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
    let list = await this.prompt.fileSystem.ls(options.files)
    if (list) {
      if (list.length) {
        this.Logger.black(this.prompt.commandPrompt.formatList(list))
      }
    } else {
      this.Logger.black(`ls: ${options.files}: No such file or directory`)
    }
    this.prompt.run()
  }
}

module.exports = Ls


