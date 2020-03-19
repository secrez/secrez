const {Secrez, Utils} = require('@secrez/core')
const {FsUtils, InternalFs, ExternalFs} = require('@secrez/fs')
const fs = require('fs-extra')

const inquirer = require('inquirer')

// eslint-disable-next-line node/no-unpublished-require
// const inquirerCommandPrompt = require('../../../../../inquirer-command-prompt')
const inquirerCommandPrompt = require('inquirer-command-prompt')
const multiEditorPrompt = require('./utils/MultiEditorPrompt')

const homedir = require('homedir')
const chalk = require('chalk')
const path = require('path')
const _ = require('lodash')

const Logger = require('./utils/Logger')
const Completion = require('./Completion')
const config = require('./config')
const Commands = require('./commands')
const welcome = require('./Welcome')

inquirer.registerPrompt('command', inquirerCommandPrompt)
inquirer.registerPrompt('multiEditor', multiEditorPrompt)

class Prompt {

  constructor() {
    this.commands = (new Commands(this, config)).getCommands()
    this.inquirer = inquirer
    this.commandPrompt = inquirerCommandPrompt
    this.getHistory = inquirerCommandPrompt.getHistory
    this.secrez = new Secrez
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs()

    inquirerCommandPrompt.setConfig({
      history: {
        save: true,
        folder: path.join(homedir(), config.root),
        limit: 100,
        blacklist: ['exit']
      }
    })
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

  short(l, m) {
    let res = []
    if (l) {
      l = _.trim(l)
      let r = l.split('/')
      if (r.length !== 1) {
        r.pop()
        r = r.join('/') + '/'
      } else {
        r = l.split(' ')
        if (r.length !== 1) {
          r.pop()
          r = r.join(' ') + ' '
        } else {
          r = l
        }
      }
      for (let i = 0; i < m.length; i++) {
        try {
          if (m[i] !== l) {
            m[i] = m[i].split(r)[1]
            if (m[i]) {
              res.push(m[i])
            }
          }
        } catch (e) {
        }
      }
    }
    return res
  }

  async run(options) {
    if (!this.loggedIn) {
      this.getCommands = Completion(config.completion)
      this.basicCommands = await this.getCommands()
      this.getCommands.bind(this)
      await welcome.start(this.secrez, options)
      this.internalFs.init(() => delete this.showLoading)
      this.loadingMessage = 'Initializing'
      await this.loading()
      this.loggedIn = true
    }
    try {
      let answers = await inquirer.prompt([
        {
          type: 'command',
          name: 'cmd',
          autoCompletion: this.getCommands,
          short: this.short,
          prefix: '[',
          noColorOnAnswered: true,
          message: `${chalk.reset(`Secrez:/${path.basename(config.workingDir)} ]`)}$`,
          context: 0,
          ellipsize: true,
          onClose: () => {
            fs.emptyDirSync(config.tmpPath)
          },
          validate: val => {
            return val
                ? true
                : chalk.grey('Press TAB for suggestions.')
          }
        }
      ]) //, {input: require('./utils/stdin')})
      await this.exec([answers.cmd])
    } catch (e) {
      // console.error(e)
      Logger.red(e.message)
    }
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

