const chalk = require('chalk')
const {Node} = require('@secrez/fs')

class Find extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.find = {
      _func: this.pseudoFileCompletion(this),
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
    if (options.global) {
      let withDataset = /:/.test(options.name)
      if (withDataset) {
        options.name = options.name.split(':')[1]
      }
      if (!options.name) {
        throw new Error('Keywords required')
      }
      let datasetInfo = await this.internalFs.getDatasetsInfo()
      let results = []
      for (let dataset of datasetInfo) {
        await this.internalFs.mountTree(dataset.index)
        options.tree = this.internalFs.trees[dataset.index]
        options.dataset = dataset.name
        results = results.concat(await this._find(options))
      }
      return results
    } else {
      let withDataset = /:/.test(options.name)
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

  formatList(list, options) {
    let re = Node.getFindRe(options)
    return list.map(e => {
      if (options.all) {
        let p = e[1].split('/')
        if (e[2] && e[2] !== p[p.length - 1]) {
          e[2] = this.formatResult(e[2], re, options.name)
        } else {
          e[2] = undefined
        }
        return [
          chalk.yellow(e[0]),
          '  ',
          this.formatResult(e[1], re, options.name),
          '  ',
          e[2],
          chalk.rgb(40, 210, 160).dim(e[3] ? '(in content)' : '')
        ].join('')

      } else {
        return this.formatResult(e[1], re, options.name)
      }
    })
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    options.name = options.keywords
    if (options.name) {
      try {
        let list = this.formatList(await this.find(options), options)
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
    this.prompt.run()
  }
}

module.exports = Find


