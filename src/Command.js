const Logger = require('./utils/Logger')
const _ = require('lodash')
const config = require('./config')
const FileSystem = require('./FileSystem')

class Command {

  constructor(prompt) {
    this.prompt = prompt
    this.config = config
    this.Logger = Logger
    this.optionDefinitions = []
  }

  help() {
  }

  setHelpAndCompletion() {
  }

  fileCompletion(self, forceCommand) {
    return async cmd => {
      try {
        // console.log('cmd', cmd)
        let commandLine = _.trim(cmd).split(' ').slice(1).join(' ')
        // console.log('commandLine', commandLine)
        const definitions = self.optionDefinitions
        const options = FileSystem.parseCommandLine(definitions, commandLine, true)
        let files = options.path
        return self.prompt.fileSystem.fileCompletion(files)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

}

module.exports = Command


