const path = require('path')

const {InternalFs, ExternalFs, DataCache} = require('@secrez/fs')
const inquirerCommandPrompt = require('inquirer-command-prompt')

const cliConfig = require('../cliConfig')
const Commands = require('../commands')


class MainPromptMock {

  async init(options) {
    this.secrez = new (require('@secrez/core').Secrez())
    await this.secrez.init(options.container, options.localDir)
    this.secrez.cache = new DataCache(path.join(options.container, 'cache'))
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs(this.secrez)
    this.commands = (new Commands(this, cliConfig)).getCommands()
    this.commandPrompt = inquirerCommandPrompt
    this.cache = {}
  }

  setCache() {
  }

  getCache() {
  }

  async run(options) {
  }

  async exec(cmds, noRun) {
  }

  async loading() {
  }

  static async setSecrezSignUp(password, iterations, method, options) {
    prompt = new MainPromptMock
    await prompt.init(options)
    await prompt.secrez[method](password, iterations)
    await prompt.internalFs.init()
    return prompt
  }

}



module.exports = MainPromptMock

