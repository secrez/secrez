const _ = require('lodash')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')

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

  pseudoFileCompletion(self, only) {
    return async files => {
      try {
        return self.prompt.internalFileSystem.pseudoFileCompletion(files, only)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  fileCompletion(self, only) {
    return async files => {
      try {
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


