// const _ = require('lodash')
const {Secrez} = require('@secrez/core')
const chalk = require('chalk')
const UserManager = require('../UserManager')

class User extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.user = {
      _self: this
    }
    this.cliConfig.completion.help.user = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'add',
        alias: 'a',
        multiple: true,
        type: String
      },
      {
        name: 'remove',
        alias: 'r',
        type: String
      },
      {
        name: 'public-key-of',
        alias: 'p',
        type: String
      },
      {
        name: 'my-public-key',
        alias: 'm',
        type: Boolean
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean
      },
    ]
  }

  help() {
    return {
      description: ['Gives info about users'],
      examples: [
        ['user -m', 'it shows your public key'],
        ['user -a pan 41ngYWoc8hkmxkst', 'adds a new trusted user pan, with public key 41ngYWoc8hkmxkst; it will ask for their public key'],
        ['user -p pan', 'returns pan\'s public key'],
        ['user -r ema', 'removes ema\'s public key'],
        ['user -l', 'listed all trusted users']
      ]
    }
  }

  async myPublicKey(options) {
    let publicKey = this.secrez.getPublicKey()
    return [chalk.grey('Your public key:'), publicKey]
  }

  async publicKeyOf(options) {
    let user = options.publicKeyOf
    let publicKey = ((await this.userManager.get()[user]) || {}).content
    if (!publicKey) {
      throw new Error(`User "${user}" is not in your trusted circle`)
    }
    return [chalk.grey(`${user}'s public key:`), publicKey]
  }

  async add(options) {
    let name = options.add[0]
    let publicKey = options.add[1]
    if (!Secrez.isValidPublicKey(publicKey)) {
      throw new Error('The public hey is not a valid one')
    }
    if (this.userManager.get(name)) {
      throw new Error(`A user named "${name}" already exists`)
    }
    let allUsers = this.userManager.get()
    for (let user in allUsers) {
      if (allUsers[user].content === publicKey) {
        throw new Error(`The user "${user}" is already associated to this public key`)
      }
    }
    await this.userManager.create({
      name,
      publicKey
    })
    return `The user "${name}" with the public key "${publicKey}" has been added to your trusted users`
  }

  async rename(options) {
    let [existentName, newName] = options.rename
    if (!this.userManager.get(existentName)) {
      throw new Error(`A user named "${existentName}" does not exist`)
    }
    if (this.userManager.get(newName)) {
      throw new Error(`A user named "${newName}" already exists`)
    }
    let error = this.userManager.validateName(newName)
    if (error) {
      throw new Error(error)
    }
    if (await this.userManager.rename(existentName, newName)) {
      return chalk.grey(`The user "${existentName}" has been renamed "${newName}"`)
    } else {
      throw new Error(`Could not rename "${existentName}"`)
    }
  }

  async remove(options) {
    let existentUser = options.remove
    if (!this.userManager.get(existentUser)) {
      throw new Error(`A user named "${existentUser}" does not exist`)
    }
    if (await this.userManager.remove(existentUser)) {
      return chalk.grey(`The user "${existentUser}" has been removed`)
    } else {
      throw new Error(`Could not remove "${existentUser}"`)
    }
  }

  async list(options) {
    let list = []
    let users = this.userManager.get()
    let max = 4
    for (let user in users) {
      let content = users[user].content
      if (options.filter) {
        if (content.split(' ')[0] !== options.filter) {
          continue
        }
      }
      list.push([user, content])
      max = Math.max(max, user.length)
    }
    return [list, max]
  }

  async user(options) {
    if (!UserManager.getCache().dataPath) {
      // for testing, when Prompt is not required
      UserManager.setCache(this.secrez.cache)
    }
    if (!this.userManager) {
      this.userManager = new UserManager
    }
    if (options.list) {
      let [list, max] = await this.list(options)
      if (options.asIs) {
        return list
      }
      const format = l => {
        return l[0] + ' '.repeat(max - l[0].length) + '  ' + l[1]
      }
      for (let i = 0; i < list.length; i++) {
        list[i] = format(list[i])
      }
      return [chalk.grey(format(['User', 'Public Key']))].concat(list)
    } else if (options.myPublicKey) {
      return this.myPublicKey(options)
    } else if (options.add) {
      return this.add(options)
    } else if (options.publicKeyOf) {
      return this.publicKeyOf(options)
    } else if (options.rename) {
      return this.rename(options)
    } else if (options.remove) {
      return this.remove(options)
    } else {
      throw new Error('Missing parameters. Run "user -h" to see examples.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let result = await this.user(options)
      if (!Array.isArray(result)) {
        result = [result]
      }
      for (let r of result) {
        this.Logger.reset(r)
      }

    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = User


