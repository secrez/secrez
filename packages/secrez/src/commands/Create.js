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

  async exec(options) {
    let prompt = this.prompt
    let exitCode = Crypto.getRandomBase58String(2)
    try {
      let {p} = await prompt.inquirer.prompt([
        {
          type: 'input',
          name: 'p',
          message: 'Type your path',
          validate: val => {
            if (val) {
              return true
            }
            return chalk.grey(`Please, type the path of your secret. Cancel typing ${exitCode}`)
          }
        }
      ])
      options.path = p
      if (options.path !== exitCode) {
        // this.Logger.grey(`Fullpath: ${path.resolve(this.cliConfig.workingDir, `./${options.path}`)}`)
        if (!options.content) {
          let {content} = await prompt.inquirer.prompt([
            {
              type: options.cleartext ? 'input' : 'password',
              name: 'content',
              message: 'Type your secret',
              validate: val => {
                if (val) {
                  if (val !== exitCode) {
                    exitCode = undefined
                  }
                  return true
                }
                return chalk.grey(`Please, type your secret. Cancel typing ${exitCode}`)
              }
            }
          ])
          // eslint-disable-next-line require-atomic-updates
          options.content = content
        }
        if (options.content !== exitCode) {
          options.type = this.prompt.secrez.config.types.TEXT
          await prompt.internalFs.make(options)
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    prompt.run()
  }
}

module.exports = Create


