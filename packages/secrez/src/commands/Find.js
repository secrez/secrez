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
        name: 'name',
        alias: 'n',
        defaultOption: true,
        type: String,
        hint: 'Search only names'
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
        name: 'global',
        alias: 'b',
        type: Boolean,
        hint: 'Search in the entire tree'
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
        ['find Wallet -ag', 'Search scanning all the versions in the entire tree']
      ]
    }
  }

  async find(options) {
    options.tree = this.internalFs.tree
    let start = options.global ? this.internalFs.tree.root : this.internalFs.tree.workingNode
    return await start.find(options)
  }

  formatResult(result, re, name) {
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


