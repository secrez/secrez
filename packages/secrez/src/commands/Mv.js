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
      // {
      //   name: 'from',
      //   alias: 'f',
      //   type: String
      // },
      {
        name: 'find',
        type: String
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
        // ['mv -f archive /old/email/* -d /old-email',
        //   'moves all the files starting from email contained in /old/email',
        //   'in the "archive" dataset to the folder "/old-email" in the current dataset'
        // ],
        ['mv --find email -d /emails', 'moves all the files found searching email to /emails;', '--find can be used only on the current dataset'],
        ['mv --find email --content-too -d /emails', 'moves all the files found searching email in paths and contents'],
        ['mv --find email --span -d /emails', 'moves all the files flattening the results']
      ]
    }
  }

  async mv(options, nodes) {
    options = _.pick(options, [
      'to',
      // 'from',
      'newPath',
      'path',
      'removing'
    ])
    let [indexFrom, indexTo] = await this.internalFs.getIndexes(options)
    await this.internalFs.mountTree(indexFrom)
    await this.internalFs.mountTree(indexTo)
    if (nodes) {
      this.internalFs.trees[indexFrom].disableSave()
      if (indexTo !== indexFrom) {
        this.internalFs.trees[indexTo].disableSave()
      }
      for (let node of nodes) {
        await this.internalFs.change(Object.assign(options, {path: node.getPath()}))
      }
      this.internalFs.trees[indexFrom].enableSave()
      await this.internalFs.trees[indexFrom].save()
      if (indexTo !== indexFrom) {
        this.internalFs.trees[indexTo].enableSave()
        await this.internalFs.trees[indexTo].save()
      }
    } else {
      await this.internalFs.change(options)
    }
  }

  async isNotDir(options = {}) {
    let dir
    try {
      let index = this.internalFs.tree.datasetIndex
      if (options.to) {
        let datasetInfo = await this.internalFs.getDatasetInfo(options.to)
        if (!datasetInfo) {
          throw new Error('Destination dataset does not exist')
        }
        index = datasetInfo.index
        await this.internalFs.mountTree(index)
      }
      let p = this.internalFs.normalizePath(options.destination, index)
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
      if (!options.path && !options.find) {
        throw new Error('An origin path is required.')
      } else if (options.find && options.from) {
        throw new Error('Find works only on the dataset in use')
      } else {
        /* istanbul ignore if  */
        if (!options.destination) {
          options.message = 'Destination not set.\nWould you like to move to the current active directory in the target dataset?'
          options.default = false
          let yes = await this.useConfirm(options)
          if (yes) {
            options.destination = '.'
          } else {
            throw new Error('Action canceled')
          }
        }
        let mustBeFolder = options.find || /\?|\*/.test(options.path)
        let nodes
        if (options.find) {
          options.getNodes = true
          options.name = options.find
          options.content = options['content-too']
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
          await this.mv(Object.assign(options, {newPath: options.destination}), nodes)
          if (options.find) {
            this.Logger.reset(`The results of searching for ${options.find} has been moved to ${options.destination}`)
          } else {
            this.Logger.reset(`${options.path} has been moved to ${options.destination}`)
          }
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


