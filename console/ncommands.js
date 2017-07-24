/* globals Promise */

const path = require('path')
const ellipsize = require('ellipsize')
const fuzzy = require('fuzzy')
const ncp = require('copy-paste')
const _ = require('lodash')

const pkg = require('../../package')

const psswrd = require('../Psswrd')
const Secret = require('../models/Secret')
const Db = require('../utils/Db')
const Shell = require('./Shell')

const context = {
  HOME: 'home',
  SECRET: 'secret'
}

const allCommands = {}

allCommands[context.HOME] = [
  'list',
  'add',
  'edit',
  '?',
  'show',
  'quit'
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
let shell
let self
let started = false

class Commands {

  constructor() {
    this.rootDir = process.cwd()
    this.setContext(context.HOME)
    this.options = {
      start: this.start,
      onKeyPress: this.onKeyPress,
      type: 'input'
    }
    self = this
    shell = new Shell(this)
  }

  completer(line) {
    // var completions = '.help .error .exit .quit .q'.split(' ')
    let completions = self.options.allCommands[self.options.context]
    let hits = completions.filter(c => {
      if (c.indexOf(line) == 0) {
        // console.log('bang! ' + c);
        return c;
      }
    });
    return [hits && hits.length ? hits : completions, line];
  }

  onKeyPress(str, key) {
    // console.log('key.name', key.name, self.options.type)
    if (self.options.type === 'password' && key.name.length < 2) {
      console.log('entering')
      self.options.answer += str
      shell.mask()
      // console.log(`You pressed the "${str}" key`, key);
    }
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

    if (!started) {

      started = true
      shell.log('\n\npsswrd v' + pkg.version, 'grey', 'bold')

      return psswrd.init()
          .then(() => {
            if (psswrd.isReady()) {
              shell.log('Welcome back. Please login into your local account', 'green')
              return self.login()
                  .then(() => this.start())
            } else {
              shell.log('Welcome. Please signup to create a local account', 'green')
              return self.signup()
                  .then(() => this.menu())
            }
          })
    } else {
      return self.menu()
    }


  }

  // clearTimeout() {
  //   if (typeof this.timeout === 'number') {
  //     clearTimeout(this.timeout)
  //   }
  // }
  //
  // copyToClipboard(str, ms) {
  //   this.clearTimeout()
  //   return new Promise((resolve, reject) => {
  //     ncp.copy(str, err => {
  //       if (err) reject(err)
  //       else {
  //         if (ms) resolve(this.resetClipboard(ms))
  //         else resolve()
  //       }
  //     })
  //   })
  // }
  //
  // resetClipboard(ms) {
  //   if (ms) {
  //     this.clearTimeout()
  //     this.timeout = setTimeout(() => {
  //       this.copyToClipboard('')
  //     }, ms)
  //     return Promise.resolve(this.timeout)
  //   } else {
  //     return this.copyToClipboard('')
  //   }
  // }
  //
  // // menu() {
  // //   inquirer.prompt([
  // //     {
  // //       type: 'autocomplete',
  // //       name: 'command',
  // //       suggestOnly: true,
  // //       message: 'Type your command',
  // //       source: this.searchCommands,
  // //       pageSize: 4,
  // //       validate: val => {
  // //         return val
  // //             ? true
  // //             : 'Type something!';
  // //       }
  // //     }
  // //   ]).then(answers => {
  // //     const cmd = answers.command.trim().replace(/\s+/, ' ').split(' ')
  // //     let command = cmd[0]
  // //     let params = cmd.splice(1).join(' ')
  // //     if (!!~commands.indexOf(command)) {
  // //       // if (/^set-/.test(command)) {
  // //       //   params = command.split('-')[1]
  // //       //   command = 'set'
  // //       // }
  // //       if (command === '?') {
  // //         command = 'help'
  // //       }
  // //       return this[command](params);
  // //     } else {
  // //       console.log([
  // //         chalk.grey('Command'),
  // //         chalk.red(command),
  // //         chalk.grey('not recognized. Type'),
  // //         chalk.cyan('?'),
  // //         chalk.grey('for help')
  // //       ].join(' '))
  // //       return this.menu()
  // //     }
  // //   });
  // // }
  //

  menu() {

    self.options.type = 'input'
    if (!self.logged) {
      delete self.options.onKeyPress
      self.options.completer = this.completer
      shell = new Shell(this)
      self.logged = true
    }

    self.options.type = 'input'
    shell.prompt()

    // return shell.question('')

    // inquirer.prompt([
    //   {
    //     type: 'input',
    //     name: 'command',
    //     message: '>',
    //     validate: val => {
    //       return val
    //           ? true
    //           : 'Type something!';
    //     }
    //   }
    // ]).then(answers => {
    //   const cmd = answers.command.trim().replace(/\s+/, ' ').split(' ')
    //   let command = cmd[0]
    //   let params = cmd.splice(1).join(' ')
    //   if (!!~commands.indexOf(command)) {
    //     // if (/^set-/.test(command)) {
    //     //   params = command.split('-')[1]
    //     //   command = 'set'
    //     // }
    //     if (command === '?') {
    //       command = 'help'
    //     }
    //     return this[command](params);
    //   } else {
    //     console.log([
    //       chalk.grey('Command'),
    //       chalk.red(command),
    //       chalk.grey('not recognized. Type'),
    //       chalk.cyan('?'),
    //       chalk.grey('for help')
    //     ].join(' '))
    //     return this.menu()
    //   }
    // });
  }

  //
  // setSpaces(str, length) {
  //   if (str.length > length - 4) {
  //     return ellipsize(str, length - 4)
  //   }
  //   const newStr = str + ' '.repeat(length - str.length)
  //   return newStr
  // }
  //
  // formatLs(list, maxSize = 40) {
  //   let elems = []
  //   for (let id in list) {
  //     elems.push(id + ': ' + list[id].name)
  //   }
  //   return this.formatList(elems, maxSize)
  // }
  //
  // formatList(elems, maxSize = 40) {
  //   const cols = this.terminalWidth()
  //   let max = 0
  //   for (let elem of elems) {
  //     max = Math.max(max, elem.length + 4)
  //   }
  //   if (max > maxSize) {
  //     max = maxSize
  //   }
  //   let columns = (cols / max) | 0
  //   let str = ''
  //   let c = 1
  //   for (let elem of elems) {
  //     str += this.setSpaces(elem, max)
  //     if (c === columns) {
  //       str += ' '.repeat(cols - max * columns)
  //       c = 1
  //     } else {
  //       c++
  //     }
  //   }
  //   return str
  // }
  //
  // list(params) {
  //   params = params.split` `
  //   let verbose = false
  //   let filter = ''
  //   for (let p of params) {
  //     if (p === '-l') {
  //       verbose = true
  //     } else if (p !== '') {
  //       filter += (filter ? ' ' : '') + p
  //     }
  //   }
  //
  //   psswrd.list(filter)
  //       .then(list => {
  //         console.log(this.formatLs(list))
  //         return this.menu()
  //       })
  //
  //
  // }
  //
  // add() {
  //
  //   var questions = [
  //     {
  //       name: 'name',
  //       type: 'input',
  //       message: 'Enter the name of the new secret:',
  //       validate: value => {
  //         if (value.length) {
  //           this.setContext(context.SECRET)
  //           return true;
  //         } else {
  //           return 'Please enter the name.';
  //         }
  //       }
  //     },
  //   ]
  //   return inquirer.prompt(questions)
  //       .then(p => {
  //         this.currentSecret = {
  //           name: p.name,
  //           content: {}
  //         }
  //         return this.menu()
  //       })
  // }
  //
  edit(params) {
    console.log(params)
    return this.menu()
  }

  show(params) {
    console.log(params)
    if (typeof params === 'string' && Db.isValidId(params)) {

    } else {
      console.log(chalk.red('The id is not valid.'))
    }

    return this.menu()
  }

  save() {

    return psswrd.setSecret(this.currentSecret)
        .then(() => {
          this.setContext(context.HOME)
          return this.menu()
        })
  }
  //
  // cancel() {
  //   this.setContext(context.HOME)
  //   return this.menu()
  // }
  //
  set(param) {

    const fields = Secret.contentFields()

    if (!param) {
      console.log([
        chalk.grey('You should specify what to set. Type'),
        chalk.bold.cyan('set ?'),
        chalk.grey('for help on available commands.')
      ].join(' '))
      return this.menu()
    } else if (param.split(' ')[0] === '?') {

      let elems = []
      for (let i in fields) {
        elems.push(fields[i])
      }
      console.log(this.formatList(elems))
      return this.menu()
    }

    var questions = [
      {
        name: 'param',
        type: 'inpur',
        message: 'Enter the ' + param + ':',
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
  //
  //
  // help() {
  //   // shows command available in the current context
  //
  //   const list = chalk.green('list') + '\n' + chalk.grey('  lists the secrets')
  //   const help = chalk.green('<command> ?') + '\n' + chalk.grey(`  shows command's help if available`)
  //   const quit = chalk.green('quit') + '\n' + chalk.grey('  quits psswrd')
  //
  //   switch (this.context) {
  //     case context.HOME:
  //       console.log(
  //           [list, help, quit].join('\n')
  //       )
  //   }
  //   return this.menu()
  // }
  //
  // quit() {
  //   psswrd.onClose()
  //   // setTimeout(clear, 300)
  //   console.log(chalk.green('Good bye!'))
  // }
  //
  login() {
    self.options.type = 'password'
    self.options.answer = ''
    return shell.question('Enter your master password:',
        answer => {
          if (answer.length || self.options.answer) {
            return true;
          } else {
            shell.log('Please enter your master password.', 'grey')
            return false
          }
        })
        .then(answer => {
              return psswrd.login(answer || self.options.answer)
                  .catch(err => {
                    console.log(err.stack)
                    shell.log('The password you typed is wrong. Try again or Ctrl-Z to exit.', 'red')
                    return this.login()
                  })
            }
        )
    // })
    //
    // var questions = [
    //   {
    //     name: 'password',
    //     type: 'password',
    //     message: 'Enter your master password:',
    //     validate: value => {
    //       if (value.length) {
    //         return true;
    //       } else {
    //         return 'Please enter your master password.';
    //       }
    //     }
    //   }
    // ]
    // return inquirer.prompt(questions)
    //     .then(p => psswrd.login(p.password))
    //     .catch(err => {
    //       red('The password you typed is wrong. Try again or Ctrl-C to exit.')
    //       return this.login()
    //     })

  }


  signup(callback) {
    self.options.type = 'password'
    self.options.answer = ''
    let password

    return shell.question('Enter your master password:',
        answer => {
          if (answer.length || self.options.answer) {
            return true;
          } else {
            shell.log('Please enter your master password.', 'grey')
            return false
          }
        })
        .then(() => {
          password = self.options.answer
          self.options.answer = ''
          return shell.question('Retype your master password:',
              answer => {
                if (answer.length || self.options.answer) {
                  return true;
                } else {
                  shell.log('Please enter your master password.', 'grey')
                  return false
                }
              })
        })
        .then(() => {
          if (password === self.options.answer) {
            return psswrd.signup(password)
          } else {
            shell.log('The two passwords do not match. Try again or Ctrl-Z to exit.', 'red')
            return this.signup()
          }
        })

    // var questions = [
    //   {
    //     name: 'password',
    //     type: 'password',
    //     message: 'Enter your password:',
    //     validate: value => {
    //       if (value.length) {
    //         return true;
    //       } else {
    //         return 'Please enter your password';
    //       }
    //     }
    //   },
    //   {
    //     name: 'retype',
    //     type: 'password',
    //     message: 'Retype your password:',
    //     validate: value => {
    //       if (value.length) {
    //         return true;
    //       } else {
    //         return 'Please enter your password';
    //       }
    //     }
    //   }
    // ]
    // return inquirer.prompt(questions)
    //     .then(p => {
    //       if (p.password === p.retype) {
    //         return psswrd.signup(p.password)
    //       } else {
    //         red('The two passwords do not match. Try again')
    //         return this.signup()
    //       }
    //     })
    //     .catch(err => {
    //       red('Unrecognized error. Try again')
    //       return this.login()
    //     })
  }

}

module.exports = new Commands