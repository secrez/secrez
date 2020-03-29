const chalk = require('chalk')
const {Crypto} = require('@secrez/core')
const {FsUtils} = require('@secrez/fs')

let thiz

class Cat extends require('../Command') {

  setHelpAndCompletion() {
    thiz = this
    this.cliConfig.completion.cat = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.cat = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'metadata',
        alias: 'm',
        type: Boolean
      },
      {
        name: 'version',
        alias: 'v',
        type: Number,
        isCompletable: true
      },
      {
        name: 'all',
        alias: 'a',
        type: Boolean
      },
      {
        name: 'utf8',
        alias: 'u',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Shows the content of a file.'],
      examples: [
        'cat ../passwords/Facebook',
        ['cat wallet -m', 'shows metadata: version and creation date'],
        ['cat etherWallet -v 2', 'shows the version 2 of the secret, if exists'],
        ['cat etherWallet -a', 'lists all the versions'],
        'cat etherWallet -mv 1',
        ['cat wallet -au', 'lists all the versions showing not-visible utf8 chars']
      ]
    }
  }

  static formatTs(ts) {
    ts = Crypto.fromTsToDate(ts)
    let date = ts[0].split('Z')[0].split('T')
    return `${Crypto.b58Hash(ts).substring(0, 4)} ${date[0]} ${date[1].substring(0,12)}${ts[1]}` //  ${date[1].substring(9) + ':' + ts[1]}`
  }

  async exec(options) {
    try {
      let data = await this.prompt.internalFs.cat(options)
      let extra = options.all || options.metadata
      if (data) {
        let header = false
        for (let d of data) {
          // eslint-disable-next-line no-unused-vars
          let {content, ts} = d
          if (extra) {
            // if (!header) {
            //   this.Logger.cyan(chalk.bold('v.id  date        hour      μs '))
            // }
            this.Logger.yellow(`${header ? '\n' : ''}${Cat.formatTs(ts)}`)
            header = true
          }
          this.Logger.reset(content)
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Cat


