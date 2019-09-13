const _ = require('lodash')
const chalk = require('chalk')
const path = require('path')
const {InternalFileSystem, fs} = require('@secrez/core')

const Logger = require('./utils/Logger')
const config = require('./config')

class Command {

  constructor(prompt) {
    this.prompt = prompt
    this.optionDefinitions = []
    this.config = config
    this.Logger = Logger
    this.chalk = chalk
    this.fs = fs
    this.path = path
    this._ = _
  }

  help() {
  }

  setHelpAndCompletion() {
  }

  pseudoFileCompletion(self) {
    return async cmd => {
      try {
        let commandLine = _.trim(cmd).split(' ').slice(1).join(' ')
        const definitions = self.optionDefinitions
        const options = InternalFileSystem.parseCommandLine(definitions, commandLine, true)
        let files = options.path
        return self.prompt.internalFileSystem.pseudoFileCompletion(files)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  fileCompletion(self, only) {
    return async cmd => {
      try {
        let commandLine = _.trim(cmd).split(' ').slice(1).join(' ')
        const definitions = self.optionDefinitions
        const options = InternalFileSystem.parseCommandLine(definitions, commandLine, true)
        let files = options.path
        return self.prompt.externalFileSystem.fileCompletion(files, only)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  threeRedDots(large) {
    return this.chalk.red(large ? '•••' : '···')
  }

}

module.exports = Command


