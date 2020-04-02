const {Secrez} = require('@secrez/core')
const {InternalFs, ExternalFs} = require('@secrez/fs')

const cliConfig = require('../../src/cliConfig')
const Commands = require('../../src/commands')


class PromptMock {

  async init(options) {
    this.secrez = new Secrez
    await this.secrez.init(options.container, options.localDir)
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs()
    this.commands = (new Commands(this, cliConfig)).getCommands()
  }

  async run(options) {

  }

  async exec(cmds, noRun) {

  }
}

module.exports = PromptMock

