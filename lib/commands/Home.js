/* globals Promise */

const _ = require('lodash')
const inquirer = require('inquirer')
const chalk = require('chalk')
const ellipsize = require('ellipsize')

const Item = require('./Item')

let self

class Home extends require('./Section') {

  constructor(secrez) {
    super(secrez)

    this.availableCommands = _.defaults({
      ls: {
        help: ['ls [options]', 'Lists all the secrets']
      },
      add: {
        help: ['add', 'Adds a new secret to your vault']
      },
      show: {
        help: ['show [secret_id]', 'Shows the specified secret', 'Press tab for suggestions'],
        subCommands: []
      },
      edit: {
        help: ['edit [secret_id]', 'Edit the specified secret', 'Press tab for suggestions'],
        subCommands: []
      },
      quit: {
        help: ['quit', 'Quits secrez']
      }
    }, this.defaultCommands)

    this.context = this.contexts.HOME
    this.updateSubcommands()

    self = this
  }

  updateSubcommands() {
    return this.ls('', true)
        .then(() => {
          if (this.secretIds.length) {
            const cmds = [{
              separator: ':'
            }]
            this.availableCommands.show.subCommands = cmds.concat(this.secretIds.map(id => 'show ' + id))
            this.availableCommands.edit.subCommands = cmds.concat(this.secretIds.map(id => 'edit ' + id))
            this.commandBlacklist = []
          } else {
            this.commandBlacklist = ['ls', 'edit', 'show']
          }
          return Promise.resolve()
        })
  }

  ls(params, internal) {
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

    return this.secrez.ls(filter)
        .then(list => {
          if (_.keys(list).length > 0 || internal) {
            let elems = []
            if (internal) {
              for (let id in list) {
                elems.push(id + ': ' + ellipsize(list[id].name, 16))
              }
              return Promise.resolve(this.secretIds = elems)
            }
            for (let id in list) {
              elems.push(id + ': ' + list[id].name)
            }
            if (verbose) {
              this.print(elems.join('\n'))
            } else {
              this.printList(elems)
            }
          }
          else {
            this.error('There are no secrets matching your search.')
          }
          return this.menu()
        })
  }

  add() {

    return new Item(this.secrez, 'add').add()
        .then(() => this.updateSubcommands())
        .then(() => this.menu())
  }

  edit(params) {
    params = params.split(' ')
    const secretId = params[0]
    return new Item(this.secrez, 'edit').edit(secretId)
        .then(() => this.updateSubcommands())
        .then(() => this.menu())
  }

  show(params) {
    params = params.split(' ')
    const secretId = params[0]
    return this.secrez.getSecret(secretId)
        .then(secret => {
          let str = [chalk.grey('name:'), secret.name]
          for (let c in secret.content) {
            str.push(chalk.grey(c + ':'), secret.content[c])
          }
          this.print(str.join('\n'))
          return this.menu()
        })
        .catch(err => {
          this.error('The secret id is invalid/wrong. Press tab to find the right id.')
          return this.menu()
        })
  }

  quit() {
    this.secrez.onClose()
    this.print('green', 'Good bye!')
  }


}

module.exports = Home