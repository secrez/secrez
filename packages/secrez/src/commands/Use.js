class Use extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.use = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.use = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'dataset',
        completionType: 'dataset',
        alias: 'd',
        defaultOption: true,
        type: String
      },
      {
        name: 'create',
        alias: 'c',
        type: Boolean
      },
      {
        name: 'rename',
        alias: 'r',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Uses a specific dataset.'],
      examples: [
        ['use archive', 'use "archive" dataset if it exists'],
        ['use -c archive', 'use the dataset named "archive";', 'if the dataset does not exists it creates it'],
        ['use archive -r unused', 'if the "archive" dataset exists, renames it "unused" and use it'],
        ['use main', 'uses the default dataset;', 'the default dataset cannot be renamed']
      ]
    }
  }

  isValid(n) {
    if (/^\d+/.test(n)) {
      throw new Error('The name of the dataset cannot start with a number')
    }
    return true
  }

  async use(options) {
    let datasetsInfo = await this.internalFs.getDatasetsInfo()
    if (options.dataset) {
      let newSet
      let newIndex
      for (let dataset of datasetsInfo) {
        if (dataset.name.toLowerCase() === options.dataset.toLowerCase()) {
          newSet = dataset
          newIndex = dataset.index
          break
        }
      }
      if (!newSet && !options.create) {
        throw new Error('The dataset does not exist; add "-c" to create it')
      }
      if (newSet && options.rename && this.isValid(options.rename)) {
        if (['main', 'trash'].includes(options.dataset)) {
          throw new Error('main and trash cannot be renamed')
        }
        let name = options.dataset
        let newName = options.rename
        for (let dataset of datasetsInfo) {
          if (dataset.name === newName) {
            throw new Error(`A dataset named ${newName} already exists`)
          }
        }
        await this.internalFs.mountTree(newIndex)
        await this.internalFs.trees[newIndex].nameDataset(newName)
        this.internalFs.updateTreeCache(newIndex, newName)
        return `The dataset ${name} has been renamed ${newName}`
      }
      if (newSet && newSet.index === this.internalFs.treeIndex) {
        return `You are already using ${options.dataset}`
      } else if (newSet) {
        await this.internalFs.mountTree(newSet.index, true)
      } else if (this.isValid(options.dataset)){
        let index = datasetsInfo[datasetsInfo.length - 1].index + 1
        await this.internalFs.mountTree(index, true)
        await this.internalFs.tree.nameDataset(options.dataset)
      }
    } else {
      throw new Error('Wrong parameters')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let result = await this.use(options)
      if (result) {
        this.Logger.reset(result)
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Use
