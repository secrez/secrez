const {Crypto} = require('@secrez/core')

class Cat extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.cat = {
      _func: this.pseudoFileCompletion(this),
      _self: this
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

  getContent(content, options) {
    if (options.utf8) {
      content = JSON.stringify(content).replace(/(^"|"$)/g, '')
    }
    return content
  }

  async exec(options) {
    try {
      let data = await this.prompt.internalFs.cat(options)
      if (data) {
        if (Array.isArray(data[0])) {
          for (let d of data) {
            // eslint-disable-next-line no-unused-vars
            let [content, a, ver, ts] = d
            // TODO fix date
            this.Logger.yellow(`Version: ${ver} - Date: ${Crypto.dateFromB58(ts)}`)
            this.Logger.reset(this.getContent(content, options))
          }
        } else {
          // eslint-disable-next-line no-unused-vars
          let [content, a, ver, ts] = data
          if (options.metadata) {
            this.Logger.yellow(`Version: ${ver} - Date: ${Crypto.dateFromB58(ts)}`)
          }
          this.Logger.reset(this.getContent(content, options))
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Cat


