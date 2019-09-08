const inquirer = require('inquirer')
// const inquirerCommandPrompt = require('inquirer-command-prompt')
const inquirerCommandPrompt = require('../../inquirer-command-prompt')
const pkg = require('../package')
const commandLineArgs = require('command-line-args')

const homedir = require('homedir')
const chalk = require('chalk')
const path = require('path')
// const _ = require('lodash')

const Utils = require('./utils')
const Logger = require('./utils/Logger')
const Completion = require('./Completion')
const config = require('./config')
const Global = require('./Global')
const Commands = require('./commands')
const FileSystem = require('./FileSystem')

const welcome = require('./Welcome')

const preferencesDir = path.join(homedir(), config.root)

inquirerCommandPrompt.setConfig({
  history: {
    save: true,
    folder: preferencesDir,
    limit: 100,
    blacklist: ['exit']
  }
})

inquirer.registerPrompt('command', inquirerCommandPrompt)

class Prompt {

  constructor(secrez) {
    this.global = new Global()
    this.commands = (new Commands(this, config)).getCommands()
    this.preferencesDir = preferencesDir
    this.inquirer = inquirer
    this.commandPrompt = inquirerCommandPrompt
    this.getHistory = inquirerCommandPrompt.getHistory
    this.secrez = secrez
    this.fileSystem = new FileSystem(secrez)
  }

  async loading() {
    this.loadingIndex = 0
    this.showLoading = true
    await Utils.sleep(100)
    while (this.showLoading) {
      const loader = ['\\', '|', '/', '-']
      this.loadingIndex = (this.loadingIndex + 1) % 4
      process.stdout.write(loader[this.loadingIndex] + ' ' + this.loadingMessage)
      await Utils.sleep(100)
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
    }
  }

  async run() {
    if (!this.loggedIn) {
      this.getCommands = Completion(config.completion)
      this.basicCommands = await this.getCommands()
      this.getCommands.bind(this)
      await welcome.start(this.secrez)
      this.fileSystem.init(() => delete this.showLoading)
      this.loadingMessage = 'Initializing'
      await this.loading()
      this.loggedIn = true
    }
    try {
      let answers = await inquirer.prompt([
        {
          type: 'command',
          name: 'cmd',
          asyncAutoCompletion: Completion(config.completion),
          wordsFilter: function (str) {
            return str.replace(/^.*\/([^/]+)$/, '$1')
          },
          prefix: Utils.capitalize(pkg.name),
          message: `${chalk.reset(`[${path.basename(config.workingDir) || '~'}]`)}$`,
          context: 0,
          validate: val => {
            return val
                ? true
                : chalk.grey('Press TAB for suggestions.')
          },
          short: true
        }
      ])
      await this.exec([answers.cmd])
    } catch (e) {
      console.error(e)
      Logger.red(e.message)
    }
  }

  async exec(cmds, noRun) {
    for (let cmd of cmds) {
      if (cmd) {
        cmd = cmd.split(' ')
        const command = cmd[0]
        if (this.basicCommands.includes(command)) {
          const commandLine = cmd.slice(1).join(' ')
          try {
            const options = FileSystem.parseCommandLine(this.commands[command].optionDefinitions, commandLine, true)
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

