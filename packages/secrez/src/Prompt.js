const chalk = require('chalk')
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const inquirer = require('inquirer')

// eslint-disable-next-line node/no-unpublished-require
// const inquirerCommandPrompt = require('../../../../../inquirer-command-prompt')
const inquirerCommandPrompt = require('inquirer-command-prompt')

const multiEditorPrompt = require('./utils/MultiEditorPrompt')

const {Secrez, Utils} = require('@secrez/core')
const {FsUtils, InternalFs, ExternalFs, DataCache} = require('@secrez/fs')

const Logger = require('./utils/Logger')
const Completion = require('./Completion')
const cliConfig = require('./cliConfig')
const Commands = require('./commands')
const welcome = require('./Welcome')

inquirer.registerPrompt('command', inquirerCommandPrompt)
inquirer.registerPrompt('multiEditor', multiEditorPrompt)

let thiz

class Prompt {

  async init(options) {
    this.inquirer = inquirer
    this.commandPrompt = inquirerCommandPrompt
    this.getHistory = inquirerCommandPrompt.getHistory
    this.secrez = new Secrez
    await this.secrez.init(options.container, options.localDir)
    this.secrez.cache = new DataCache(path.join(this.secrez.config.container, 'cache'))
    await this.secrez.cache.load('id')
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs()
    thiz = this
    inquirerCommandPrompt.setConfig({
      history: {
        save: false,
        limit: 100,
        blacklist: ['exit']
      },
      onCtrlEnd: thiz.reorderCommandLineWithDefaultAtEnd
    })
    this.commands = (new Commands(this, cliConfig)).getCommands()
  }

  reorderCommandLineWithDefaultAtEnd(line) {
    // reorder the line to put autocompletable words at the end of the line
    let previousLine = line
    line = _.trim(line).split(' ')
    let cmd = line[0]
    if (cmd && thiz.commands[cmd]) {
      let definitions = thiz.commands[cmd].optionDefinitions
      let def = {}
      let selfCompletables = 0
      for (let d of definitions) {
        def[d.name] = d
        if (d.defaultOption || d.isCompletable) selfCompletables++
      }
      let params = FsUtils.parseCommandLine(definitions, line.slice(1).join(' '))
      let result = []
      for (let key in params) {
        if (key !== '_unknown') {
          result.push(Utils.getKeyValue(params, key))
        }
      }
      result.sort((a, b) => {
        let A = def[a.key]
        let B = def[b.key]
        return (
            A.defaultOption ? 1
                : B.defaultOption ? -1
                : A.isCompletable ? 1
                    : B.isCompletable ? -1
                        : 0
        )
      })
      let ret = [cmd]
      for (let c of result) {
        if (!def[c.key].defaultOption) {
          if (ret.length && /^-/.test(ret[ret.length -1])) {
            ret[ret.length -1] += def[c.key].alias
          } else {
            ret.push('-' + def[c.key].alias)
          }
        }
        if (def[c.key].type !== Boolean) {
          ret.push(c.value)
        }
      }
      if (selfCompletables === 2 && previousLine === ret.join(' ')) {
        let len = ret.length
        if (len > 3) {
          ret = ret.slice(0, len - 3)
              .concat(ret.slice(len - 1, len))
              .concat(ret.slice(len - 3, len - 1))
        }
      }
      return ret.join(' ')
    } else {
      return ''
    }
  }

  async saveHistory() {
    let histories = JSON.stringify(inquirerCommandPrompt.getHistories(true))
    let encryptedHistory = this.secrez.encryptData(histories)
    await fs.writeFile(this.secrez.config.historyPath, encryptedHistory)
  }

  async loadSavedHistory() {
    let previousHistories
    if (await fs.pathExists(this.secrez.config.historyPath)) {
      let encryptedHistory = await fs.readFile(this.secrez.config.historyPath, 'utf8')
      previousHistories = JSON.parse(this.secrez.decryptData(encryptedHistory))
      inquirerCommandPrompt.setHistoryFromPreviousSavedHistories(previousHistories)
    }
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
    }
    // eslint-disable-next-line no-console
    // console.log()
    try {
      let pre = chalk.reset(`Secrez ${this.internalFs.tree.name}:${this.internalFs.tree.workingNode.getPath()}`)
      let answers = await inquirer.prompt([
        {
          type: 'command',
          name: 'cmd',
          autoCompletion: this.getCommands,
          short: this.short,
          prefix: pre,
          // noColorOnAnswered: true,
          colorOnAnswered: 'grey',
          message: '$',
          context: 0,
          ellipsize: true,
          autocompletePrompt: chalk.grey('Available options:'),
          onClose: () => {
            fs.emptyDirSync(cliConfig.tmpPath)
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
            console.error(e)
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

