const path = require('path')

const {InternalFs, ExternalFs, DataCache} = require('@secrez/fs')
const inquirerCommandPrompt = require('inquirer-command-prompt')

const cliConfig = require('../../src/cliConfig')
const Commands = require('../../src/commands')


class MainPromptMock {

  async init(options) {
    this.secrez = new (require('@secrez/core').Secrez())
    await this.secrez.init(options.container, options.localDir)
    this.secrez.cache = new DataCache(path.join(options.container, 'cache'))
    // await this.secrez.cache.load('id')
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs(this.secrez)
    this.commands = (new Commands(this, cliConfig)).getCommands()
    this.commandPrompt = inquirerCommandPrompt
    // this.clearScreen = {
    //   pause: new Function
    // }
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
}

module.exports = MainPromptMock

