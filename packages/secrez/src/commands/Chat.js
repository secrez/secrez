// const _ = require('lodash')
// const {chalk} = require('../utils/Logger')
// const path = require('path')
// const {Crypto, config} = require('@secrez/core')
// const {Node} = require('@secrez/fs')
// const {isYaml, yamlParse} = require('@secrez/utils')

class Chat extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.chat = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.chat = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Enters the Secrez chat'],
      examples: [
        'chat'
      ]
    }
  }

  async chat(options) {

  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      await this.chat(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Chat


