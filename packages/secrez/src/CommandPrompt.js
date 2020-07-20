const chalk = require('chalk')
const _ = require('lodash')
const fs = require('fs-extra')
const inquirer = require('inquirer')

// eslint-disable-next-line node/no-unpublished-require
// const inquirerCommandPrompt = require('../../../../inquirer-command-prompt')
const inquirerCommandPrompt = require('inquirer-command-prompt')

const multiEditorPrompt = require('./utils/MultiEditorPrompt')
const {sleep, getKeyValue} = require('@secrez/utils')
const {FsUtils} = require('@secrez/fs')


const Logger = require('./utils/Logger')
const cliConfig = require('./cliConfig')

inquirer.registerPrompt('command', inquirerCommandPrompt)
inquirer.registerPrompt('multiEditor', multiEditorPrompt)

const clearScreen = require('./ClearScreen')

let thiz

class CommandPrompt {

  async getReady(options) {
    thiz = this
    this.inquirer = inquirer
    this.commandPrompt = inquirerCommandPrompt
    this.historyPath = options.historyPath
    this.getHistory = inquirerCommandPrompt.getHistory
    inquirerCommandPrompt.setConfig({
      history: {
        save: false,
        limit: 100,
        blacklist: ['exit']
      },
      onCtrlEnd: thiz.reorderCommandLineWithDefaultAtEnd
    })
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
          result.push(getKeyValue(params, key))
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
          if (ret.length && /^-/.test(ret[ret.length - 1])) {
            ret[ret.length - 1] += def[c.key].alias
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
    await fs.writeFile(this.historyPath, encryptedHistory)
  }

  async loadSavedHistory() {
    let previousHistories
    if (await fs.pathExists(this.historyPath)) {
      let encryptedHistory = await fs.readFile(this.historyPath, 'utf8')
      previousHistories = JSON.parse(this.secrez.decryptData(encryptedHistory))
      inquirerCommandPrompt.setHistoryFromPreviousSavedHistories(previousHistories)
    }
  }

  async loading() {
    this.loadingIndex = 0
    this.showLoading = true
    await sleep(100)
    while (this.showLoading) {
      const loader = ['\\', '|', '/', '-']
      this.loadingIndex = (this.loadingIndex + 1) % 4
      process.stdout.write(loader[this.loadingIndex] + ' ' + this.loadingMessage)
      await sleep(100)
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
            if (r !== l) {
              m[i] = m[i].replace(RegExp('^' + r), '')
            }
            if (m[i]) {
              res.push(m[i].replace(/^(-[a-zA-Z]{1} |--\w+(=| ))/, ''))
            }
          }
        } catch (e) {
        }
      }
    }
    return res
  }

  async preRun(options, cmd) {
    // can be implemented by the extending class
  }

  async postRun(options, cmd) {
    // must be implemented by the extending class
  }

  prePromptMessage(options) {
    return 'Prompt'
  }

  lastPrePromptMessage(pre, options = {}) {
    return `Prompt`
  }

  availableOptionsMessage(options) {
    return chalk.grey('Available options:')
  }

  async run(options) {
    await this.preRun(options)
    if (this.disableRun) {
      return
    }
    try {
      let pre = this.prePromptMessage(options)
      this.lastpre = this.lastPrePromptMessage(pre)
      let {cmd} = await inquirer.prompt([
        {
          type: 'command',
          name: 'cmd',
          autoCompletion: this.getCommands,
          short: this.short,
          prefix: pre,
          // noColorOnAnswered: true,
          colorOnAnswered: 'grey',
          message: options.message || '$',
          context: 0,
          ellipsize: true,
          autocompletePrompt: this.availableOptionsMessage(),
          onClose: () => {
            fs.emptyDirSync(cliConfig.tmpPath)
          },
          validate: val => {
            return val
                ? true
                : chalk.grey('Press TAB for suggestions.')
          }
        }
      ])
      options.cmd = _.trim(cmd)
      await this.postRun(options)
    } catch (e) {
      // console.error(e)
      Logger.red(e.message)
    }
  }

}

module.exports = CommandPrompt

