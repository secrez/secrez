const _ = require('lodash')
const chalk = require('chalk')
const {Crypto, ConfigUtils} = require('@secrez/core')
const {Node} = require('@secrez/fs')

class Mv extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.mv = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.mv = true
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
        name: 'destination',
        alias: 'd',
        type: String
      },
      {
        name: 'to',
        alias: 't',
        type: String
      },
      {
        name: 'from',
        alias: 'f',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Moves and renames files or folders.',
        'It asks for the destination.'],
      examples: [
        'mv somefile -d someother',
        'mv -p ../dir1/file -d ../dir1/file-renamed',
        ['mv pass/email* -d emails', 'moves all the files starting from email contained in pass'],
        ['mv pass/email* -d /old/email -t archive',
          'moves all the files starting from email contained in pass',
          'to the folder "/old/email" in the "archive" dataset;',
          'The autocomplete works only in the current dataset (for now)'
        ],
        ['mv -f archive /old/email/* -d /old-email',
          'moves all the files starting from email contained in /old/email',
          'in the "archive" dataset to the folder "/old-email" in the current dataset'
        ]
      ]
    }
  }

  async mv(options, nodes) {

    // TODO moving a folder, moves the folder's content. Must be fixed.

    options = _.pick(options, [
      'to',
      'from',
      'newPath',
      'path'
    ])
    if (nodes) {
      let [indexFrom, indexTo] = await this.internalFs.getIndexes(options)
      if (!this.internalFs.trees[indexFrom]) {
        await this.internalFs.mountTree(indexFrom)
      }
      if (!this.internalFs.trees[indexTo]) {
        await this.internalFs.mountTree(indexTo)
      }
      this.internalFs.trees[indexFrom].disableSave()
      if (indexTo !== indexFrom) {
        this.internalFs.trees[indexTo].disableSave()
      }
      for (let node of nodes) {
        await this.internalFs.change(Object.assign(options, {path: node.getPath()}))
      }
      this.internalFs.trees[indexFrom].enableSave()
      if (indexTo !== indexFrom) {
        this.internalFs.trees[indexTo].enableSave()
      }
      this.internalFs.tree.save()

    } else {
      await this.internalFs.change(options)
    }
  }

  async isNotDir(destination, options) {
    let dir
    try {
      let index = this.internalFs.tree.datasetIndex
      if (options.to) {
        let datasetInfo = await this.internalFs.getDatasetInfo(options.to)
        if (!datasetInfo) {
          throw new Error('Destination dataset does not exist')
        }
        index = datasetInfo.index
        if (!this.internalFs.trees[index]) {
          await this.internalFs.mountTree(index)
        }
      }
      let p = this.internalFs.normalizePath(destination, index)
      dir = this.internalFs.trees[index].root.getChildFromPath(p)
    } catch (e) {
    }
    return !(dir && Node.isDir(dir))
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!options.path) {
        throw new Error('An origin path is required.')
      } else if (!options.destination) {
        throw new Error('A destination path is required.')
      } else {
        let useWildcard = /\?|\*/.test(options.path)
        let nodes = await this.internalFs.pseudoFileCompletion(options.path, null, true)
        if (nodes.length) {
          if (useWildcard) {
            if (await this.isNotDir(options)) {
              throw new Error('When using wildcards, the target has to be a folder')
            }
          }
          await this.mv(Object.assign(options, {newPath: options.destination}), nodes)
          this.Logger.reset(`${options.path} has been moved to ${options.destination}`)
        } else {
          this.Logger.red('Path does not exist')
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Mv


