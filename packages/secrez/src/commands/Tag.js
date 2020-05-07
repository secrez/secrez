const _ = require('lodash')
const {chalk} = require('../utils/Logger')
const Case = require('case')

class Tag extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.tag = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.tag = true
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
        name: 'show',
        alias: 's',
        multiple: true,
        type: String
      },
      {
        name: 'add',
        alias: 'a',
        multiple: true,
        type: String
      },
      {
        name: 'remove',
        alias: 'r',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: [
        'Tags a file and shows existent tags.'
      ],
      examples: [
        'tag ethWallet.yml -t wallet,ethereum',
        ['tag ethWallet.yml -r ethereum', 'removes tag "ethereum"'],
        ['tag -l', 'lists all tags'],
        ['tag -s wallet', 'lists all files tagged wallet'],
        ['tag -s email cloud', 'lists all files tagged email and cloud']
      ]
    }
  }

  async tag(options) {
    let result = []
    if (options.list) {
      return this.tree.listTags()
    } else if (options.show) {
      result = await this.tree.getNodesByTag(options.show)
      if (!result.length) {
        throw new Error('Tagged files not found')
      }
      return result
    } else if (options.path) {
      let p = this.tree.getNormalizedPath(options.path)
      let node = this.tree.root.getChildFromPath(p)
      if (options.add) {
        await this.tree.addTag(node, options.add.map(e => Case.snake(_.trim(e))))
        let s = options.add.length > 1 ? 's' : ''
        result = [`Tag${s} added`]
      } else if (options.remove) {
        await this.tree.removeTag(node, options.remove.map(e => Case.snake(_.trim(e))))
        let s = options.remove.length > 1 ? 's' : ''
        result = [`Tag${s} removed`]
      }
      return result
    }
    throw new Error('Insufficient parameters')
  }

  formatResult(result) {
    const cols = process.stdout.columns
        || 80 // workaround for lerna testing

    let max = 0
    let mak = 0
    for (let r of result) {
      max = Math.max(max, r[0].length)
      mak = Math.max(mak, r[1].length)
    }

    if (max + mak + 2 > cols) {
      return result.map(e => e[0] + '\n' + chalk.blu(e[1]))
    } else {
      return result.map(e => e[0] + ' '.repeat(max - e[0].length) + '  ' + chalk.blu(e[1]))
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      let result = await this.tag(options)
      if (options.list) {
        this.Logger.blu(this.prompt.commandPrompt.formatList(result, 26, true, this.threeRedDots()))
      } else if (options.show) {
        this.Logger.reset(this.formatResult(result).join('\n'))
      } else {
        this.Logger.grey(result.join('\n'))
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Tag


