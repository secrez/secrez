class Ls extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.ls = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.ls = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
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
      },
      {
        name: 'all',
        alias: 'a',
        type: Boolean
      },
      {
        name: 'datasets',
        alias: 'd',
        type: Boolean
      },
      {
        name: 'only',
        alias: 'o',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Browses the directories.'],
      examples: [
        'ls coin',
        'ls ../passwords',
        'ls ~',
        ['ls -al', 'Includes hidden files'],
        ['ls -o d', 'Lists only the directories'],
        ['ls -o f', 'Lists only the files'],
        ['ls -d', 'Lists the existent datasets']
      ]
    }
  }

  async ls(options = {}) {
    let datasetInfo = await this.internalFs.getDatasetsInfo()
    if (options.datasets) {
      return datasetInfo.map(e => e.name)
    } else {
      if (!options.path) {
        options.path = '.'
      }
      options.ignoreDatasets = true
      if (datasetInfo.map(e => e.name).includes(options.path)) {
        options.path += ':'
      }
      return await this.internalFs.fileList(options, true)
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let list = await this.ls(options)
      list = list.filter(e => !/^\./.test(e) || options.all).sort()
      if (list.length) {
        this.Logger.reset(options.list
            ? list.join('\n')
            : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
        )
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Ls


