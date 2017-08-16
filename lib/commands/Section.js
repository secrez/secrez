/* globals Promise */

const chalk = require('chalk')
const _ = require('lodash')

const inquirer = require('inquirer')
const InquirerCommandPrompt = require('../../../inquirer-command-prompt')
inquirer.registerPrompt('command', InquirerCommandPrompt)

const constants = require('../config/constants')

class Section {

  constructor(secrez) {
    this.secrez = secrez
    this.defaultCommands = {
      'help': {
        help: ['help', 'Shows an help like this']
      }
    }
    this.availableCommands = _.defaults({}, this.defaultCommands)
    this.ifTabsAndNoSuggestions = '?'
    this.basePrompt = '>'
    this.context = -1
    this.contexts = constants.contexts
  }

  getBasicCommands() {
    let commands = []
    for (let command in this.availableCommands) {
      commands.push(command)
    }
    return commands
  }

  getAvailableCommands() {
    let commands = []
    for (let command in this.availableCommands) {
      if (this.availableCommands[command].subCommands) {
        commands = commands.concat(this.availableCommands[command].subCommands)
      } else {
        commands.push(command)
      }
    }
    return commands
  }

  getCommands() {
    // this can be overwritten for special behaviors
    return this.getAvailableCommands()
  }


  print(...data) {
    if (data.length > 1) {
      let message = ''
      for (let i = 0; i < data.length; i += 2) {
        message += chalk[data[i] || 'reset'](data[i + 1])
      }
      console.log(message)
    } else {
      console.log(data[0])
    }
  }

  menu() {
    return inquirer.prompt([
      {
        type: 'command',
        name: 'command',
        message: this.basePrompt,
        autoCompletion: this.getCommands,
        ifTabsAndNoSuggestions: this.ifTabsAndNoSuggestions || '?',
        context: this.context,
        validate: val => {
          return val
              ? true
              : chalk.grey('I you don\'t know the available commands, type ') + chalk.green('help') + chalk.grey(' for help')
        }
      }
    ]).then(answers => {
      const cmd = answers.command.trim().replace(/\s+/, ' ').split(' ')
      let command = cmd[0]
      let params = cmd.splice(1).join(' ')
      if (!!~this.getBasicCommands().indexOf(command) && this[command]) {
        return this[command](params);
      } else {
        this.error('Command not recognized. Type ' + chalk.green('help') + ' for help.')
        return this.menu()
      }
    }).catch(err => {
      console.error(err.stack)
    })
  }

  formatList(list, maxSize = 40) {
    return InquirerCommandPrompt.formatList(list, maxSize, true)
  }

  printList(list, maxSize) {
    console.log(this.formatList(list, maxSize))
  }

  error(str) {
    this.print('red', '>> ', 'grey', str)
  }

  help() {
    let message = ''
    for (let command in this.availableCommands) {
      let help = this.availableCommands[command].help
      if (help) {
        message += (message ? '\n' : '') + chalk.green(help[0])
        for (let i = 1; i < help.length; i++) {
          message += '\n    ' + chalk.grey(help[i])
        }
      }
    }
    console.log(message)
    return this.menu()
  }

  clearTimeout() {
    if (typeof this.timeout === 'number') {
      clearTimeout(this.timeout)
    }
  }

  copyToClipboard(str, ms) {
    this.clearTimeout()
    return new Promise((resolve, reject) => {
      ncp.copy(str, err => {
        if (err) reject(err)
        else {
          if (ms) resolve(this.resetClipboard(ms))
          else resolve()
        }
      })
    })
  }

  resetClipboard(ms) {
    if (ms) {
      this.clearTimeout()
      this.timeout = setTimeout(() => {
        this.copyToClipboard('')
      }, ms)
      return Promise.resolve(this.timeout)
    } else {
      return this.copyToClipboard('')
    }
  }

}

module.exports = Section