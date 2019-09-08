const Logger = require('./utils/Logger')
const {debug} = require('./utils/Logger')
const _ = require('lodash')
const Utils = require('./utils')
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

  fileCompletion(self) {
    return async cmd => {
      try {
        const commandLine = _.trim(cmd).split(' ').slice(1).join(' ')
        const definitions = self.optionDefinitions
        const options = FileSystem.parseCommandLine(definitions, commandLine, true)
        let files = options.files || options.directory || '.'
        return self.prompt.fileSystem.fileCompletion(files)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

}

module.exports = Command


