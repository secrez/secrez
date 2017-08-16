/* globals Promise */

const _ = require('lodash')
const inquirer = require('inquirer')
const chalk = require('chalk')
const ellipsize = require('ellipsize')

const Db = require('../utils/Db')
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
        help: ['show [secret_id]', 'Shows a specific secret to your vault', 'If the id is not specified it will ask you for it']
      },
      quit: {
        help: ['quit', 'Quits secrez']
      }
    }, this.defaultCommands)

    this.context = this.contexts.HOME
    this.ls('', true)

    self = this
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
          if (_.keys(list).length > 0) {
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

  getCommands(line) {

    try {

      if (/^sh/.test(line)) {
        return [{
          separator: ':'
        }].concat(self.secretIds.map(id => 'show ' + id))
      } else {
        return self.getAvailableCommands()
      }
    } catch (err) {
      console.error(err.stack)
      return self.getAvailableCommands()
    }
  }

  add() {

    return new Item(this.secrez, 'add').add()
        .then(() => this.ls('', true))
        .then(() => this.menu())
  }

  edit(params) {
    console.log(params)
    return this.menu()
  }

  show(params) {
    if (typeof params === 'string') {
      const secretId = params.slice(0, 6)
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
    } else {
      this.error('The id is not valid.')
      return this.menu()
    }
  }

  quit() {
    this.secrez.onClose()
    this.print('green', 'Good bye!')
  }


}

module.exports = Home