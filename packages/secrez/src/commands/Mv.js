const chalk = require('chalk')
const {Crypto} = require('@secrez/core')

class Mv extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.mv = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.mv = true
    this.optionDefinitions = [
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
      description: ['Moves and renames files or folders.',
        'It asks for the destination.'],
      examples: [
        'mv somefile',
        'mv -p ../dir1/file'
      ]
    }
  }

  async mv(options) {
    await this.internalFs.change({
      path: options.path,
      newPath: options.newPath
    })
  }


  async exec(options) {
    try {
      if (!options.path) {
        throw new Error('An origin path is required.')
      } else {
        if (this.internalFs.tree.root.getChildFromPath(options.path)) {
          let prompt = this.prompt
          let exitCode = Crypto.getRandomBase58String(2)
          let destination = options.destination
          /* istanbul ignore if  */
          if (!destination) {
            destination = (await prompt.inquirer.prompt([
              {
                type: 'input',
                name: 'destination',
                message: 'Type the destination',
                validate: val => {
                  if (val) {
                    return true
                  }
                  return chalk.grey(`Please, type the destination. Cancel typing ${exitCode}`)
                }
              }
            ])).destination
          }
          if (destination !== exitCode) {
            await this.mv({
              path: options.path,
              newPath: destination
            })
            this.Logger.reset(`${options.path} has been moved to ${destination}`)
          }
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Mv


