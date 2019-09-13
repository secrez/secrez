const {Crypto} = require('@secrez/core')

class Cat extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.cat = {
      _func: this.pseudoFileCompletion(this)
    }
    this.config.completion.help.cat = true
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
        type: Number
      },
      {
        name: 'all',
        alias: 'a',
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
        'cat etherWallet -mv 1'
      ]
    }
  }

  async exec(options) {
    // eslint-disable-next-line no-unused-vars
    try {
      let [content, a, ver, ts] = await this.prompt.internalFileSystem.cat(options)
      if (content) {
        if (typeof content === 'string') {
          if (options.metadata) {
            this.Logger.yellow(`Version: v${ver} - Date: ${Crypto.dateFromB58(ts)}`)
          }
          this.Logger.dim(content)
        }
      }
    } catch (e) {
      console.error(e)
    }
    this.prompt.run()
  }
}

module.exports = Cat


