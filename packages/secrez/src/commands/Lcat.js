const {Utils} = require('@secrez/core')
const fs = require('fs-extra')

class Lcat extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lcat = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.lcat = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'force',
        alias: 'f',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Similar to a standard cat in the external fs.'],
      examples: [
        'lcat ../passwords/Facebook',
        ['lcat -f somefile.ext', 'Force view even if file looks binary']
      ]
    }
  }

  async lcat(options) {
    let efs = this.externalFs
    let p = efs.getNormalizedPath(options.path)
    if (!options.force && await Utils.isBinary(p)) {
      throw new Error('The file looks as a binary file')
    } else {
      return await fs.readFile(p, 'utf8')
    }
  }

  async exec(options = {}) {
    try {
      let data = await this.lcat(options)
      this.Logger.reset(data)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Lcat


