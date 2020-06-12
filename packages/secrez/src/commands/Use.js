const {Tree} = require('@secrez/fs')

class Use extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.use = {
      _func: this.completion(this),
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
        multiple: true,
        type: String
      }
    ]
  }

  completion() {

  }

  help() {
    return {
      description: ['Uses a specific dataset.'],
      examples: [
        ['use archive', 'use "archive" dataset if it exists'],
        ['use -c archive', 'use the dataset named "archive";', 'if the dataset does not exists it creates it'],
        ['use -r archive unused', 'if the "archive" dataset exists, renames it "unused"'],
        ['use main', 'uses the default dataset;', 'the default dataset cannot be renamed']
      ]
    }
  }

  async use(options) {
    let datasetsInfo = await this.internalFs.getDatasetsInfo()
    if (options.rename) {
      if (options.rename.length !== 2) {
        throw new Error('Wrong number of parameters')
      }
      if (['main', 'trash'].includes(options.rename[0])) {
        throw new Error('main and trash cannot be renamed')
      }
      let name0 = options.rename[0]
      let name1 = options.rename[1]
      let originalTree
      let originalIndex
      for (let dataset of datasetsInfo) {
        if (dataset.name === name1) {
          throw new Error(`A dataset named ${name1} already exists`)
        }
        if (dataset.name === name0) {
          originalIndex = dataset.index
          originalTree = this.internalFs.trees[dataset.index]
          /* istanbul ignore if  */
          if (!originalTree) {
            originalTree = new Tree(this.internalFs.secrez, dataset.index)
          }
        }
      }
      if (!originalTree) {
        throw new Error('Dataset not found')
      }
      await originalTree.nameDataset(name1)
      this.internalFs.updateTreeCache(originalIndex, name1)
      return `The dataset ${name0} has been renamed ${name1}`
    } else if (options.dataset) {
      let newSet
      for (let dataset of datasetsInfo) {
        if (dataset.name.toLowerCase() === options.dataset.toLowerCase()) {
          newSet = dataset
          break
        }
      }
      if (!newSet && !options.create) {
        throw new Error('The dataset does not exist; add "-c" to create it')
      }
      if (newSet && newSet.index === this.internalFs.treeIndex) {
        return `You are already using ${options.dataset}`
      } else
        if (newSet) {
        await this.internalFs.mountTree(newSet.index, true)
      } else {
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
      let result = await this.use(options)
      if (result) {
        this.Logger.reset(result)
      }
    } catch(e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

/*
(archive:/DigitalOcean) Secrez $
 */

module.exports = Use
