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
    this.internalFs = prompt.internalFs
    this.externalFs = prompt.externalFs
    this.Logger = Logger
    this.chalk = chalk
  }

  help() {
  }

  showHelp() {
    let command = this.constructor.name.toLowerCase()
    this.prompt.commands.help.exec({command})
  }

  setHelpAndCompletion() {
  }

  pseudoFileCompletion(self) {
    return async (options, extraOptions = {}, defaultDef) => {
      options = Object.assign(extraOptions, options)
      options.forAutoComplete = true
      return await self.prompt.internalFs.pseudoFileCompletion(options, true)
    }
  }

  fileCompletion(self) {
    return async (options, extraOptions = {}, defaultDef) => {
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

  validate(options, mandatoryOptions) {
    if (options._unknown) {
      throw new Error(`Unknown option: ${options._unknown} `+ chalk.grey(`(run "${this.constructor.name.toLowerCase()} -h" for help)`))
    }
    if (mandatoryOptions) {
      let err = ''
      let prefix = 'Missing options: '
      for (let o in mandatoryOptions) {
        if (!options[o]) {
          err += (err ? ', ' : '') + o
        }
      }
      if (err) {
        throw new Error(prefix + err)
      }
    }
  }

}

module.exports = Command


