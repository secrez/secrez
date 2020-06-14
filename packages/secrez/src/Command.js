const {chalk} = require('./utils/Logger')
const Logger = require('./utils/Logger')
const cliConfig = require('./cliConfig')
const {Crypto} = require('@secrez/core')

class Command {

  constructor(prompt) {
    this.prompt = prompt
    this.optionDefinitions = []
    this.cliConfig = cliConfig
    this.Logger = Logger
    this.internalFs = prompt.internalFs
    this.externalFs = prompt.externalFs
  }

  help() {
  }

  showHelp() {
    let command = this.constructor.name.toLowerCase()
    this.prompt.commands.help.exec({command})
  }

  setHelpAndCompletion() {
  }

  pseudoFileCompletion(self, extraOptions = {}) {
    return async options => {
      options = Object.assign(extraOptions, options)
      options.forAutoComplete = true
      return await self.prompt.internalFs.pseudoFileCompletion(options, true)
    }
  }

  fileCompletion(self, extraOptions = {}) {
    return async options => {
      options = Object.assign(extraOptions, options)
      options.forAutoComplete = true
      return await self.prompt.externalFs.fileCompletion(options)
    }
  }

  threeRedDots(large) {
    return chalk.cyan(large ? '•••' : '···')
  }

  async useEditor(options) {
    /* istanbul ignore if  */
    if (options) {
      let message = 'your OS default editor.'
      if (options.internal) {
        message = 'the minimalistic internal editor.'
      } else if (options.editor) {
        message = `${options.editor}.`
      }
      let extraMessage = chalk.dim('Press <enter> to launch ')
          + message
          + chalk.reset(
              options.internal ? chalk.green('\n  Ctrl-d to save the changes. Ctrl-c to abort.') : ''
          )
      let {result} = await this.prompt.inquirer.prompt([{
        type: 'multiEditor',
        name: 'result',
        message: 'Editing...',
        default: options.content,
        tempDir: this.cliConfig.tmpPath,
        validate: function (text) {
          return true
        },
        extraMessage
      }])
      return result
    }
  }


  async useSelect(options) {
    /* istanbul ignore if  */
    if (options) {
      let cancel = '(cancel)'
      if (!options.dontCancel) {
        options.choices = options.choices.concat([cancel])
      }
      let {result} = await this.prompt.inquirer.prompt([
        {
          type: 'list',
          name: 'result',
          message: options.message,
          choices: options.choices
        }
      ])
      if (result === cancel) {
        return
      } else {
        return result
      }
    }
  }

  async useConfirm(options) {
    /* istanbul ignore if  */
    if (options) {
      let {result} = await this.prompt.inquirer.prompt([
        {
          type: 'confirm',
          name: 'result',
          message: options.message,
          default: options.default
        }
      ])
      return result
    }
  }

  async useInput(options) {
    /* istanbul ignore if  */
    if (options) {
      let prompt = this.prompt
      let exitCode = Crypto.getRandomBase58String(2)
      let {result} = await prompt.inquirer.prompt([
        {
          type: options.type || 'input',
          name: 'result',
          message: options.message,
          default: options.content,
          validate: val => {
            if (val) {
              if (options.validate) {
                if (options.validate(val)) {
                  return chalk.red(options.onValidate)
                }
              } else {
                return true
              }
            }
            return chalk.grey(`Please, type the ${options.name}, or cancel typing ${exitCode}`)
          }
        }
      ])
      if (result !== exitCode) {
        return result
      } else {
        return options.content
      }
    }
  }

}

module.exports = Command


