const chalk = require('chalk')

const {Crypto} = require('@secrez/core')

class Create extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.create = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.create = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'cleartext',
        alias: 'c',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: [
        'Creates interactively a file containing a secret.',
        '"create" asks for the path and the secret.'
      ],
      examples: [
        ['create', 'prompts, by default, an hidden input for the secret'],
        ['create -c', 'prompts a cleartext input']
      ]
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    let exitCode = Crypto.getRandomBase58String(2)
    try {
      /* istanbul ignore if  */
      if (!options.path) {
        let {p} = await this.prompt.inquirer.prompt([
          {
            type: 'input',
            name: 'p',
            message: 'Type your path',
            validate: val => {
              if (val === exitCode) {
                throw new Error('Command canceled.')
              }
              return chalk.grey(`Please, type the path of your secret, or cancel typing ${exitCode}`)
            }
          }
        ])
        options.path = p
      }
      /* istanbul ignore if  */
      if (!options.content) {
        let {content} = await this.prompt.inquirer.prompt([
          {
            type: options.cleartext ? 'input' : 'password',
            name: 'content',
            message: 'Type your secret',
            validate: val => {
              if (val) {
                if (val === exitCode) {
                  throw new Error('Command canceled.')
                }
                return true
              }
              return chalk.grey(`Please, type your secret, or cancel typing ${exitCode}`)
            }
          }
        ])
        // eslint-disable-next-line require-atomic-updates
        options.content = content
      }
      options.type = this.cliConfig.types.TEXT
      await this.prompt.internalFs.make(options)

    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Create


