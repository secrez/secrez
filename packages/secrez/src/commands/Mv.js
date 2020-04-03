const {config, Crypto} = require('@secrez/core')

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
      },
      {
        name: 'dest',
        alias: 'd',
        type: String,
        isCompletable: true
      }
    ]
  }

  help() {
    return {
      description: ['Moves and renames files or folders.'],
      examples: [
        'mv somefilename -d somenewname',
        'mv -p dir1/file -d dir2/file',
        'mv dir1/file -d dir2/file2',
      ]
    }
  }

  async mv(options) {
    // await this.internalFs.update(options)
  }

  async exec(options) {
    if (!options.path) {
      this.Logger.red('Missing parameters.')
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
              // return chalk.grey(`Please, type the path of your secret. Cancel typing ${exitCode}`)
            }
          }
        ])
        options.path = p
        if (options.path !== exitCode) {
        } else {
        }
      } catch (e) {

      }
      try {
        await this.mv(options)
      } catch (e) {
        this.Logger.red(e.message)
      }
    }
    this.prompt.run()
  }
}

module.exports = Mv


