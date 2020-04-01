const _ = require('lodash')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')

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
  }

  help() {
  }

  setHelpAndCompletion() {
  }

  pseudoFileCompletion(self, extraOptions = {}) {
    return async options => {
      options = Object.assign(extraOptions, options)
      try {
        return self.prompt.internalFs.pseudoFileCompletion(options)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  fileCompletion(self, extraOptions = {}) {
    return async options => {
      options = Object.assign(extraOptions, options)
      try {
        return self.prompt.externalFs.fileCompletion(options)
      } catch (e) {
        Logger.red(['error', e])
      }
    }
  }

  threeRedDots(large) {
    return chalk.red(large ? '•••' : '···')
  }

}

module.exports = Command


