const chalk = require('chalk')
const {Node} = require('@secrez/fs')

class Find extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.find = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.find = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'keywords',
        alias: 'k',
        defaultOption: true,
        type: String
      },
      {
        name: 'content',
        alias: 'c',
        type: Boolean,
        hint: 'Search also in contents'
      },
      {
        name: 'all',
        alias: 'a',
        type: Boolean,
        hint: 'Search all the versions'
      },
      {
        name: 'sensitive',
        alias: 's',
        type: Boolean,
        hint: 'Make the search case-sensitive'
      },
      {
        name: 'root',
        alias: 'r',
        type: Boolean,
        hint: 'Search starting from the root'
      },
      {
        name: 'global',
        alias: 'g',
        type: Boolean,
        hint: 'Search in all the datasets'
      },
      {
        name: 'trash-too',
        alias: 't',
        type: Boolean,
        hint: 'If global, search also in trash'
      }
    ]
  }

  help() {
    return {
      description: [
        'Find a secret.',
        'By default the search is case-unsensitive.'
      ],
      examples: [
        ['find Ethereum', 'Search for entries with ethereum or Ethereum in the name'],
        ['find -c 0xAB', 'Search for files with the string "0xAB" in their content'],
        ['find -sn Wallet', 'Search for names containings "Wallet" from the current dir'],
        ['find Wallet -ag', 'Search scanning all the versions in all the datasets'],
        ['find archive:allet', 'Search allet in the archive dataset']
      ]
    }
  }

  async find(options) {
    if (!options.name && options.keywords) {
      options.name = options.keywords
    }
    let splitted = options.name.split(':')
    let withDataset = splitted.length > 1
    if (options.global || (splitted[1] && !splitted[0])) {
      if (withDataset) {
        options.name = splitted[1]
      }
      if (!options.name) {
        throw new Error('Keywords required')
      }
      let datasetInfo = await this.internalFs.getDatasetsInfo()
      let results = []
      for (let dataset of datasetInfo) {
        if (options.global && !options.trashToo && dataset.index === 1) {
          continue
        }
        await this.internalFs.mountTree(dataset.index)
        options.tree = this.internalFs.trees[dataset.index]
        options.dataset = dataset.name
        results = results.concat(await this._find(options))
      }
      return results
    } else {
      let data = await this.internalFs.getTreeIndexAndPath(options.name)
      if (withDataset) {
        options.dataset = data.name
      }
      options.name = data.path
      options.tree = data.tree
      return await this._find(options)
    }
  }

  async _find(options) {
    let start = options.tree[options.root ? 'root' : 'workingNode']
    return (await start.find(options)).map(e => {
      if (options.dataset) {
        e[1] = options.dataset + ':' + e[1]
      }
      return e
    })
  }

  formatResult(result, re) {
    if (re.test(result)) {
      return result.replace(re, a => chalk.bold(a))
    } else {
      return result
    }
  }

  formatIndex(len, i) {
    return ' '.repeat(len.toString().length - i.toString().length) + i
  }

  formatList(list, options) {
    let re = Node.getFindRe(options)
    let i = 0
    return list.map(e => {
      i++
      let k = this.formatIndex(list.length, i)
      if (options.all) {
        let p = e[1].split('/')
        let l = p.length
        let c = p[l - 1] ? p[l - 1] : p[l - 2]
        if (e[2] && e[2] !== c) {
          e[2] = this.formatResult(e[2], re, options.name)
        } else {
          e[2] = undefined
        }
        return [
          k,
          '  ',
          chalk.yellow(e[0]),
          '  ',
          this.formatResult(e[1], re, options.name),
          '  ',
          e[2]
        ].join('')

      } else {
        return [
          k,
          '  ',
          this.formatResult(e[1], re, options.name)
        ].join('')
      }
    })
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      options.name = options.keywords
      if (options.name) {
        try {
          this.lastResult = await this.find(options)
          let list = this.formatList(this.lastResult, options)
          if (list && list.length) {
            this.Logger.grey(`${list.length} result${list.length > 1 ? 's' : ''} found:`)
            for (let l of list) this.Logger.reset(l)
          } else {
            this.Logger.grey('No results.')
          }

        } catch (e) {
          this.Logger.red(e.message)
        }
      } else {
        this.Logger.grey('Missing parameters')
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Find


