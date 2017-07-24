/* globals Promise */

const path = require('path')
const chalk = require('chalk')
const clear = require('clear')
const CLI = require('clui')
const figlet = require('figlet')
const ellipsize = require('ellipsize')
const inquirer = require('inquirer')

var InquirerCommandPrompt = require('../prompts/inquirer-command-prompt')
inquirer.registerPrompt('command', InquirerCommandPrompt)


inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const fuzzy = require('fuzzy')
const ncp = require('copy-paste')
const Minimatch = require("minimatch").Minimatch

const filter = (array, pattern) => {
  return array.filter(minimatch.filter(pattern, {matchRe: true, nocase: true}))
}

const Preferences = require('preferences')
// const Spinner = CLI.Spinner

const _ = require('lodash')
const touch = require('touch')

const pkg = require('../../package')
const prefs = new Preferences('psswrd')

const psswrd = require('../Psswrd')
const Secret = require('../models/Secret')
const Db = require('../utils/Db')

const context = {
  HOME: 'home',
  SECRET: 'secret'
}

const r = chalk.red
const G = chalk.green
const g = chalk.grey

const allCommands = {}

allCommands[context.HOME] = [
  'ls',
  'add',
  'help',
  'show',
  'quit',
  '?'
]

allCommands[context.SECRET] = [
  'set',
  'remove',
  'save',
  'cancel',
  'delete',
  '?'
]

let commands
let self

class Commands {

  constructor() {
    this.rootDir = process.cwd()
    this.setContext(context.HOME)
    self = this
  }

  setContext(ctx) {
    this.context = ctx
    commands = allCommands[ctx]
  }

  searchCommands(answers, input) {
    input = input || ''
    return new Promise(resolve => {
      // setTimeout(() => {
      var fuzzyResult = fuzzy.filter(input, commands)
      resolve(fuzzyResult.map(el => {
        return el.original
      }))
      // }, _.random(30, 200))
    })
  }

  terminalWidth() {
    return process.stdout.columns
  }

  terminalHeight() {
    return process.stdout.rows
  }

  start() {


    console.log(
        chalk.blue(figlet.textSync(pkg.name, {
              font: 'Small',
              horizontalLayout: 'default',
              verticalLayout: 'default'
            }),
            '\n psswrd v' + pkg.version) + '\n');

    return psswrd.init()
        .then(() => {
          if (psswrd.isReady()) {
            console.log(G('Welcome back. Please login into your local account'))
            return this.login()
                .then(() => this.menu())
          } else {
            console.log(G('Welcome! Please signup to create a local account'))
            return this.signup()
                .then(() => this.menu())
          }
        })
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

  currentCommands() {
    // we use self instead of this, because this is called from the context of InquirerJS
    return allCommands[self.context]
  }

  menu() {
    inquirer.prompt([
      {
        type: 'command',
        name: 'command',
        message: '>',
        autoComplete: this.currentCommands,
        context: this.context,
        validate: val => {
          return val
              ? true
              : g('I you don\'t know the available commands, type ') + G('?') + g(' for help')
        }
      }
    ]).then(answers => {
      const cmd = answers.command.trim().replace(/\s+/, ' ').split(' ')
      let command = cmd[0]
      if (command === '?') {
        command = 'help'
      }
      let params = cmd.splice(1).join(' ')
      if (!!~commands.indexOf(command)) {
        return this[command](params);
      } else {
        this.error('Command not recognized. Type ? for help.')
        return this.menu()
      }
    });
  }

  setSpaces(str, length) {
    if (str.length > length - 4) {
      return ellipsize(str, length - 4)
    }
    const newStr = str + ' '.repeat(length - str.length)
    return newStr
  }

  formatLs(list, maxSize = 40) {
    let elems = []
    for (let id in list) {
      elems.push(id + ': ' + list[id].name)
    }
    return this.formatList(elems, maxSize)
  }

  formatList(elems, maxSize = 40) {
    const cols = this.terminalWidth()
    let max = 0
    for (let elem of elems) {
      max = Math.max(max, elem.length + 4)
    }
    if (max > maxSize) {
      max = maxSize
    }
    let columns = (cols / max) | 0
    let str = ''
    let c = 1
    for (let elem of elems) {
      str += this.setSpaces(elem, max)
      if (c === columns) {
        str += ' '.repeat(cols - max * columns)
        c = 1
      } else {
        c++
      }
    }
    return str
  }

  ls(params) {
    params = params.split` `
    let verbose = false
    let filter = ''
    for (let p of params) {
      if (p === '-l') {
        verbose = true
      } else if (p !== '') {
        filter += (filter ? ' ' : '') + p
      }
    }

    psswrd.ls(filter)
        .then(list => {
          if (_.keys(list).length > 0)
            console.log(this.formatLs(list))
          else
            this.error('There are no secrets matching your search.')
          return this.menu()
        })
  }

  error(str) {
    console.log(r('>>'), g(str))
  }

  add() {

    var questions = [
      {
        name: 'name',
        type: 'input',
        message: 'Enter the name of the new secret:',
        validate: value => {
          if (value.length) {
            this.setContext(context.SECRET)
            return true;
          } else {
            return 'Please enter the name.';
          }
        }
      },
    ]
    return inquirer.prompt(questions)
        .then(p => {
          this.currentSecret = {
            name: p.name,
            content: {}
          }
          return this.menu()
        })
  }

  edit(params) {
    console.log(params)
    return this.menu()
  }

  show(params) {
    console.log(params)
    if (typeof params === 'string' && Db.isValidId(params)) {

    } else {
      console.log(r('The id is not valid.'))
    }

    return this.menu()
  }


  save() {

    return psswrd.setSecret(this.currentSecret)
        .then(() => {
          console.log(g('The new secret has been saved.'))
          this.setContext(context.HOME)
          return this.menu()
        })
  }

  cancel() {
    this.setContext(context.HOME)
    return this.menu()
  }

  set(param) {

    const fields = Secret.contentFields()

    if (!param) {
      this.error('You should specify what to set. Type ' +
        chalk.cyan('set ?') +
        ' for help on available commands.')
      return this.menu()
    } else if (param.split(' ')[0] === '?') {

      let elems = []
      for (let i in fields) {
        elems.push(i+', '+fields[i])
      }
      console.log(this.formatList(elems))
      return this.menu()
    }

    var questions = [
      {
        name: 'param',
        type: 'command',
        message: 'Enter the ' + param + ':',
        context: this.context,
        validate: value => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter the name.';
          }
        }
      },
    ]
    return inquirer.prompt(questions)
        .then(p => {
          this.currentSecret.content[param] = p.param
          return this.menu()
        })
  }


  help() {
    // shows command available in the current context

    const ls = G('ls [options]') + '\n' + g('  Lists all the secrets')
    const help = G('help [command]') + '\n' + g(`  Shows this help or [command]'s help`)
    const quit = G('quit') + '\n' + g('  Quits psswrd')

    switch (this.context) {
      case context.HOME:
        console.log(
            [ls, help, quit].join('\n')
        )
    }
    return this.menu()
  }

  quit() {
    psswrd.onClose()
    // setTimeout(clear, 300)
    console.log(G('Good bye!'))
  }

  login(callback) {
    var questions = [
      {
        name: 'password',
        type: 'password',
        message: 'Enter your master password:',
        validate: value => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your master password.';
          }
        }
      }
    ]
    return inquirer.prompt(questions)
        .then(p => psswrd.login(p.password))
        .catch(err => {
          this.error('The password you typed is wrong. Try again or Ctrl-C to exit.')
          return this.login()
        })

  }

  signup(callback) {
    var questions = [
      {
        name: 'password',
        type: 'password',
        message: 'Enter your password:',
        validate: value => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your password';
          }
        }
      },
      {
        name: 'retype',
        type: 'password',
        message: 'Retype your password:',
        validate: value => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your password';
          }
        }
      }
    ]
    return inquirer.prompt(questions)
        .then(p => {
          if (p.password === p.retype) {
            return psswrd.signup(p.password)
          } else {
            this.error('The two passwords do not match. Try again')
            return this.signup()
          }
        })
        .catch(err => {
          this.error('Unrecognized error. Try again')
          return this.login()
        })
  }

}

module.exports = new Commands