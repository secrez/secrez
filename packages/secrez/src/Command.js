const chalk = require('chalk')

const Logger = require('./utils/Logger')
const cliConfig = require('./cliConfig')

class Command {

  constructor(prompt) {
    this.prompt = prompt
    this.optionDefinitions = []
    this.cliConfig = cliConfig
    this.Logger = Logger
    this.internalFs = prompt.internalFs
    this.externalFs = prompt.externalFs
    this.tree = prompt.internalFs.tree
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
      try {
        return await self.prompt.internalFs.pseudoFileCompletion(options)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  fileCompletion(self, extraOptions = {}) {
    return async options => {
      options = Object.assign(extraOptions, options)
      options.forAutoComplete = true
      try {
        return await self.prompt.externalFs.fileCompletion(options)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  threeRedDots(large) {
    return chalk.yellow(large ? '•••' : '···')
  }

}

module.exports = Command


