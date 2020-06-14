const _ = require('lodash')
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
        multiple: true,
        type: String
      },
      // {
      //   name: 'destination',
      //   alias: 'd',
      //   type: String
      // },
      // {
      //   name: 'to',
      //   alias: 't',
      //   type: String
      // },
      // {
      //   name: 'from',
      //   alias: 'f',
      //   type: String
      // },
      {
        name: 'find',
        type: String,
        multiple: true
      },
      {
        name: 'content-too',
        type: Boolean
      },
      {
        name: 'span',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Moves and renames files or folders.',
        'If a destination is not specified it tries to move to the current folder.'],
      examples: [
        'mv somefile someother',
        'mv -p ../dir1/file -d ../dir1/file-renamed',
        ['mv pass/email* emails', 'moves all the files starting from email contained in pass'],
        ['mv pass/email* archive:/old/email',
          'moves all the files starting from email contained in pass',
          'to the folder "/old/email" in the "archive" dataset;',
          'The autocomplete works only in the current dataset (for now)'
        ],
        ['mv archive:/old/email/* /old-email',
          'moves all the files starting from email contained in /old/email',
          'in the "archive" dataset to the folder "/old-email" in the current dataset'
        ],
        ['mv --find email /emails', 'moves all the files found searching email to /emails;'],
        ['mv --find email /emails --content-too', 'moves all the files found searching email in paths and contents'],
        ['mv --find email archive:/emails --span ', 'moves all the files flattening the results']
      ]
    }
  }

  async mv(options, nodes) {
    let dataFrom = await this.internalFs.getTreeIndexAndPath(options.path)
    await this.internalFs.mountTree(dataFrom.index)
    let dataTo = await this.internalFs.getTreeIndexAndPath(options.newPath)
    if (dataFrom.index !== dataTo.index) {
      await this.internalFs.mountTree(dataTo.index)
    }
    if (nodes) {
      this.internalFs.trees[dataFrom.index].disableSave()
      this.internalFs.trees[dataTo.index].disableSave()
      for (let node of nodes) {
        await this.internalFs.change(Object.assign(options, {path: `${dataFrom.name}:${node.getPath()}`}))
      }
      this.internalFs.trees[dataFrom.index].enableSave()
      await this.internalFs.trees[dataFrom.index].save()
      if (dataFrom.index !== dataTo.index) {
        this.internalFs.trees[dataTo.index].enableSave()
        await this.internalFs.trees[dataTo.index].save()
      }
    } else {
      await this.internalFs.change(options)
    }
  }

  async isNotDir(options = {}) {
    let dir
    try {
      let data = await this.internalFs.getTreeIndexAndPath(options.newPath || '')
      options.newPath = data.path
      options.to = data.name
      let index = this.internalFs.tree.datasetIndex
      if (options.to) {
        let datasetInfo = await this.internalFs.getDatasetInfo(options.to)
        if (!datasetInfo) {
          throw new Error('Destination dataset does not exist')
        }
        index = datasetInfo.index
        await this.internalFs.mountTree(index)
      }
      let p = this.internalFs.normalizePath(options.newPath, index)
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
      if (options.find) {
        options.newPath = options.find[1]
        options.find = options.find[0]
      } else {
        options.newPath = options.path[1]
        options.path = options.path[0]
      }
      if (!options.path && !options.find) {
        throw new Error('An origin path is required.')
      } else {
        /* istanbul ignore if  */
        if (!options.newPath) {
          options.message = 'Destination not set.\nWould you like to move to the current active directory in the target dataset?'
          options.default = false
          let yes = await this.useConfirm(options)
          if (yes) {
            options.newPath = '.'
          } else {
            throw new Error('Action canceled')
          }
        }
        let mustBeFolder = options.find || /\?|\*/.test(options.path)
        let nodes
        if (options.find) {
          options.getNodes = true
          options.name = options.find
          options.content = options.contentToo
          nodes = await this.prompt.commands.find.find(options)
          if (!options.span) {
            for (let i = 0; i < nodes.length; i++) {
              if (i > 0) {
                if (Node.isAncestor(nodes[i - 1], nodes[i])) {
                  nodes.splice(i, 1)
                  i--
                }
              }
            }
          }
        } else {
          nodes = await this.internalFs.pseudoFileCompletion({
            path: options.path,
            asIs: true
          }, null, true)
        }
        if (nodes.length) {
          if (mustBeFolder) {
            if (await this.isNotDir(options)) {
              throw new Error('When using search results or wildcards, the target has to be a folder')
            }
          }
          await this.mv(Object.assign(options, {newPath: options.newPath}), nodes)
          if (options.find) {
            this.Logger.reset(`The results of searching for ${options.find} has been moved to ${options.newPath}`)
          } else {
            this.Logger.reset(`${options.path} has been moved to ${options.newPath}`)
          }
        } else {
          this.Logger.red('Path does not exist')
        }
      }
    } catch (e) {
      console.log(e)
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Mv


