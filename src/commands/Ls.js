const path = require('path')
const fs = require('../utils/fs')
const _ = require('lodash')

class Ls extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ls = {
      _func: this.fileCompletion(this)
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

  async ls(fileSystem, files) {
    let list = await fileSystem.fileCompletion(files)
    return list.map(f => {
      f = f.split('/')
      let l = f.length - 1
      if (f[l]) {
        return f[l]
      } else {
        return f[l - 1] + '/'
      }
    })
  }

  async exec(options) {
    let list = await this.ls(this.prompt.fileSystem, options.path)
    if (list) {
      if (list.length) {
        this.Logger.black(this.prompt.commandPrompt.formatList(list))
      }
    } else {
      this.Logger.black(`ls: ${options.path}: No such file or directory`)
    }
    this.prompt.run()
  }
}

module.exports = Ls


