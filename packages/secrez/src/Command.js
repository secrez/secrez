const {chalk} = require('./utils/Logger')
const Logger = require('./utils/Logger')
const cliConfig = require('./cliConfig')
const PreCommand = require('./PreCommand')

class Command extends PreCommand {

  constructor(prompt) {
    super()
    this.prompt = prompt
    this.secrez = prompt.secrez
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

  checkPath(options) {
    if (typeof options.path !== 'string' || !options.path) {
      throw new Error('A valid path is required')
    }
  }

  validate(options) {
    if (options._unknown) {
      throw new Error(`Unknown option: ${options._unknown} `+ chalk.grey(`(run "${this.constructor.name.toLowerCase()} -h" for help)`))
    }
  }

}

module.exports = Command


