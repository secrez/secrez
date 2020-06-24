const {chalk} = require('./utils/Logger')
const {Crypto} = require('@secrez/core')


class PreCommand {

  async useEditor(options) {
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


  async useSelect(options) {
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

  async useConfirm(options) {
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

  async useInput(options) {

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
            if (val === exitCode) {
              return true
            } else if (options.validate) {
              return options.validate(val, exitCode)
            } else if (val.length) {
              return true
            }
          }
          return chalk.grey(`Please, type the ${options.name}, or cancel typing ${chalk.bold(exitCode)}`)
        }
      }
    ])
    if (result !== exitCode) {
      return result
    }
  }


}

module.exports = PreCommand


