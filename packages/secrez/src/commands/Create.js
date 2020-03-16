const {Crypto} = require('@secrez/core')

class Create extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.create = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.config.completion.help.create = true
    this.optionDefinitions = [
      {
        name: 'content',
        alias: 'c',
        type: String
      },
      {
        name: 'hidden',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      }
    ]
  }

  help() {
    return {
      description: [
        'Creates a file containing a secret.',
        '"create" expects a file path (the default value) and a content.',
        'If some or both are not provided "create" will ask for them.'
      ],
      examples: [
        'create',
        'create -c afe456f4e3a3cdc4',
        'create ../coins/ether2-pwd -c "hs^teg&66_2jhsg"',
        ['create "my new wallet" -h', 'prompts a password (hidden) input for the secret']
      ]
    }
  }

  async exec(options) {
    let prompt = this.prompt
    let exitCode
    try {
      if (!options.path) {
        this.Logger.red('A path where to save the secret is required.')
      } else {
        this.Logger.grey(`Fullpath: ${this.path.resolve(this.config.workingDir, `./${options.path}`)}`)
        if (!options.content) {
          let {content} = await prompt.inquirer.prompt([
            {
              type: options.hidden ? 'password' : 'input',
              name: 'content',
              message: 'Type your secret',
              validate: val => {
                if (val) {
                  if (val !== exitCode) {
                    exitCode = undefined
                  }
                  return true
                }
                exitCode = Crypto.getRandomString(2, 'hex')
                return this.chalk.grey(`Please, type your secret. If you like to cancel, type the code ${exitCode}`)
              }
            }
          ])
          // eslint-disable-next-line require-atomic-updates
          options.content = content
        }
        if (options.content !== exitCode) {
          await prompt.internalFs.create(options.path, options.content)
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    prompt.run()
  }
}

module.exports = Create


