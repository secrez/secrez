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
  }

  help() {
  }

  setHelpAndCompletion() {
  }

  // multiFileCompletion(self, extraOptions = {}) {
  //
  //   return async (options, line) => {
  //     options = Object.assign(extraOptions, options)
  //     console.log(options, line)
  //     // try {
  //     //   return self.prompt.internalFs.pseudoFileCompletion(files, only)
  //     // } catch (e) {
  //     //   Logger.red(['error', e])
  //     // }
  //   }
  // }
  //
  //

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


