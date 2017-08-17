/* globals Promise */

const _ = require('lodash')
const chalk = require('chalk')
const inquirer = require('inquirer')
const Secret = require('../models/Secret')
const {SYNC} = require('../config/constants')

class Item extends require('./Section') {

  constructor(secrez, type, secretId) {
    super(secrez)

    this.availableCommands = _.defaults({
      save: {
        help: ['save', 'Saves the current secret']
      },
      cancel: {
        help: ['cancel', 'Cancel and reverses any change']
      },
      review: {
        help: ['review', 'Reviews the secret']
      },
      set: {
        help: ['set [field]', 'Sets (overwrites) a new field', 'Use tab to autocomplete and see the available fields'],
        subCommands: []
      },
      delete: {
        help: ['delete [field]', 'Deletes the specified field'],
        subCommands: []
      }
    }, this.defaultCommands)

    for (let f of _.values(Secret.contentFields())) {
      this.availableCommands.set.subCommands.push('set ' + f)
      this.availableCommands.delete.subCommands.push('delete ' + f)
    }
    this.basePrompt = type + ' >'
    this.context = this.contexts.ITEM
  }

  add() {

    return inquirer
        .prompt([
          {
            name: 'name',
            type: 'input',
            message: 'Enter the name of the new secret:',
            validate: value => {
              if (_.trim(value).length) {
                return true;
              } else {
                return 'Please enter the name.';
              }
            }
          },
        ])
        .then(p => {
          this.currentSecret = {
            name: _.trim(p.name),
            content: {}
          }
          return this.menu()
        })
  }

  edit(secretId) {

    return this.secrez.getSecret(secretId)
        .then(secret => {
          this.currentSecret = secret.cloneForEdit()
          return this.menu()
        })
  }

  save() {

    return this.secrez.setSecret(this.currentSecret)
        .then(() => {
          this.print('green','The secret has been saved.')
          return Promise.resolve()
        })
  }

  cancel() {
    return Promise.resolve()
  }

  review() {

    let str = [chalk.grey('name:'), this.currentSecret.name]
    for (let c in this.currentSecret.content) {
      str.push(chalk.grey(c + ':'), this.currentSecret.content[c])
    }
    this.print(str.join('\n'))

    return this.menu()
  }

  set (param) {

    const fields = Secret.contentFields()

    if (!param) {
      this.error('You should specify what to set. Press tab to autocomplete')
      return this.menu()
    } else {
      if (!~this.availableCommands.set.subCommands.indexOf('set ' + param)) {
        this.error('You should specify a valid field. Press tab to see which fields are accepted')
        return this.menu()
      }
    }
    // Selse if (param.split(' ')[0] === '?') {
    //
    //   this.printList(_.values(fields))
    //   return this.menu()
    // }

    let currentValue = this.currentSecret.content[param]
    if (currentValue) {
      this.print('grey', 'Current value: ', 'green', currentValue, 'grey', '\nJust press Enter to leave it unchanged')
    }

    let type = 'input'
    switch (param) {
      case 'notes':
        type = 'editor'

    }

    var questions = [
      {
        name: 'param',
        type,
        message: 'Enter the ' + param + ':',
        context: this.context,
        validate: value => {
          if (value.length || currentValue) {
            return true;
          } else {
            return 'Please enter the name.';
          }
        }
      },
    ]
    return inquirer.prompt(questions)
        .then(p => {
          if (p.param) {
            this.currentSecret.content[param] = p.param
          }
          return this.menu()
        })
  }


}

module.exports = Item