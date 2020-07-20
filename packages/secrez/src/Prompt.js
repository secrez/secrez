const chalk = require('chalk')
const _ = require('lodash')
const path = require('path')
const inquirer = require('inquirer')

// eslint-disable-next-line node/no-unpublished-require
// const inquirerCommandPrompt = require('../../../../inquirer-command-prompt')
const inquirerCommandPrompt = require('inquirer-command-prompt')

const multiEditorPrompt = require('./utils/MultiEditorPrompt')
const {Secrez} = require('@secrez/core')
const {FsUtils, InternalFs, ExternalFs, DataCache} = require('@secrez/fs')

const Logger = require('./utils/Logger')
const Completion = require('./Completion')
const cliConfig = require('./cliConfig')
const Commands = require('./commands')
const welcome = require('./Welcome')
const AliasManager = require('./AliasManager')
const UserManager = require('./UserManager')

inquirer.registerPrompt('command', inquirerCommandPrompt)
inquirer.registerPrompt('multiEditor', multiEditorPrompt)

const CommandPrompt = require('./CommandPrompt')

class Prompt extends CommandPrompt {

  async init(options) {
    this.secrez = new Secrez
    await this.secrez.init(options.container, options.localDir)
    this.secrez.cache = new DataCache(path.join(this.secrez.config.container, 'cache'), this.secrez)
    this.secrez.cache.initEncryption('alias', 'user')
    await this.secrez.cache.load('id')
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs()
    this.getReady({
      historyPath: this.secrez.config.historyPath
    })
    this.commands = (new Commands(this, cliConfig)).getCommands()
  }

  async preRun(options) {
    if (!this.loggedIn) {
      this.getCommands = Completion(cliConfig.completion)
      this.basicCommands = await this.getCommands()
      this.getCommands.bind(this)
      await welcome.start(this.secrez, options)
      this.internalFs.init().then(() => delete this.showLoading)
      this.loadingMessage = 'Initializing'
      await this.loading()
      await this.loadSavedHistory()
      this.loggedIn = true
      let alerts = this.internalFs.tree.alerts
      if (alerts.length) {
        Logger.red(alerts[0])
        Logger.cyan(alerts.slice(1).join('\n'))
      }
      await this.secrez.cache.load('alias')
      await this.secrez.cache.load('user')
      AliasManager.setCache(this.secrez.cache)
      this.aliasManager = new AliasManager()
      UserManager.setCache(this.secrez.cache)
      this.userManager = new UserManager()
    }
  }

  prePromptMessage(options) {
    return chalk.reset(`Secrez ${this.internalFs.tree.name}:${this.internalFs.tree.workingNode.getPath()}`)
  }

  lastPrePromptMessage(pre, options = {}) {
    return `${pre} ${chalk.bold('$')}`
  }

  async postRun(options) {
    let cmd = options.cmd
    let components = cmd.split(' ')
    let command = components[0]
    /* istanbul ignore if  */
    if (!this.basicCommands.includes(command)) {
      command = command.replace(/^\$/, '')
      let data = this.aliasManager.get(command)
      if (data) {
        let cmds = data.commandLine.split('&&').map(e => _.trim(e))
        let max = 0
        let missing = false
        for (let i = 0; i < cmds.length; i++) {
          let c = cmds[i]
          let params = c.match(/\$\w{1}/g)
          if (params) {
            for (let p of params) {
              let num = parseInt(p.substring(1))
              max = Math.max(max, num)
              let option = components[num]
              if (!option) {
                missing = true
              }
              c = c.replace(RegExp('\\$' + num), option)
            }
          }
          if (!missing) {
            Logger.green('>>  ' + chalk.bold.grey(c))
            this.disableRun = i !== cmds.length - 1
            await this.exec([c])
            if (i === cmds.length - 1) {
              return
            }
          }
        }
        if (missing) {
          Logger.red(`The alias "${command}" requires ${max} parameter${max > 1 ? 's' : ''}`)
          this.disableRun = false
        }
        this.run()
        return
      }
      Logger.red('Command not found')
      this.run()
      return
    }
    await this.exec([cmd])
    this.previousCommandLine = cmd

  }

  async exec(cmds, noRun) {
    for (let cmd of cmds) {
      if (cmd) {
        cmd = cmd.split(' ')
        const command = cmd[0]
        if (this.basicCommands.includes(command)) {
          let commandLine = cmd.slice(1).join(' ')
          if (!commandLine) {
            // prevent command-line-args from parsing process.argv
            commandLine = ' '
          }
          try {
            const options = FsUtils.parseCommandLine(this.commands[command].optionDefinitions, commandLine, true)
            await this.commands[command].exec(options)
          } catch (e) {
            // console.error(e)
            Logger.red(e.message)
            this.run()
          }
        } else {
          Logger.red('Command not found.')
          if (!noRun) {
            this.run()
          }
        }
      }
    }
  }
}

module.exports = Prompt

