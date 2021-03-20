const Crypto = require('@secrez/crypto')
const {utils: hubUtils} = require('@secrez/hub')
const chalk = require('chalk')
const ContactManager = require('../utils/ContactManager')
const superagent = require('superagent')

class Contacts extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.contacts = {
      _self: this
    }
    this.cliConfig.completion.help.contacts = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean,
        default: true
      },
      {
        name: 'add',
        alias: 'a',
        type: String
      },
      {
        name: 'update',
        alias: 'u',
        type: String
      },
      {
        name: 'delete',
        alias: 'd',
        type: String
      },
      {
        name: 'rename',
        alias: 'r',
        type: String,
        multiple: true
      },
      {
        name: 'show',
        alias: 's',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Manages your contacts'],
      examples: [
        ['contacts -a pan', 'adds a new trusted contact pan, asking for his public key or hub url'],
        ['contacts -u pan', 'updates the hub url'],
        ['contacts -s pan', 'returns pan\'s public key and url'],
        ['contacts -d ema', 'deletes ema\'s data'],
        ['contacts -r ema joe', 'renames ema'],
        ['contacts', 'listed all trusted contacts']
      ]
    }
  }

  async getPublicKeyFromUrl(url) {
    try {
      url = new URL(url)
      let id = hubUtils.getClientIdFromHostname(url.hostname)
      let apiurl = url.protocol + '//' + url.host.split(id + '.')[1]
      let res = await superagent
          .get(`${apiurl}/api/v1/publickey/${id}`)
          .set('Accept', 'application/json')
      return res.body.publickey
    } catch (e) {
      throw new Error('Inactive/wrong url')
    }
  }

  async createContact(options) {
    const {name} = options
    if (options.update) {
      await this.contactManager.remove(name)
    }
    await this.contactManager.create({
      name,
      publicKey: options.publicKey,
      url: options.url
    })
  }

  async add(options) {
    let name = options.name = options.add
    let existingDataIfSo = this.contactManager.get(name)
    if (existingDataIfSo) {
      throw new Error(`A contact named "${name}" already exists`)
    }
    let publicKey
    let url
    if (process.env.NODE_ENV === 'test') {
      publicKey = options.publicKey
      url = options.url
    } else {
      let choice = await this.useSelect({
        message: 'Chose method',
        choices: ['Public key', 'Url on hub']
      })
      if (!choice) {
        throw new Error('Operation canceled')
      }
      if (choice === 'Url on hub') {
        url = await this.useInput(Object.assign(options, {
          message: `Paste ${name}'s url on hub`
        }))
        if (!url) {
          throw new Error('Operation canceled')
        }
        try {
          publicKey = await this.getPublicKeyFromUrl(url)
        } catch (e) {
        }
      } else {
        publicKey = await this.useInput(Object.assign(options, {
          message: `Paste ${name}'s public key`
        }))
      }
      if (!publicKey) {
        throw new Error(choice === 'Url on hub' ? 'Client not found on hub' : 'Operation canceled')
      }
    }
    if (!Crypto.isValidSecrezPublicKey(publicKey)) {
      throw new Error('The public key is not a valid one')
    }
    if (url && !hubUtils.isValidUrl(url)) {
      throw new Error('The url does not look valid')
    }
    this.checkIfAlreadyExists(name, publicKey, url)
    await this.createContact(Object.assign(options, {publicKey, url}))
    return `The contact "${name}" has been added to your trusted contacts`
  }

  checkIfAlreadyExists(name, publicKey, url) {
    let allContacts = this.contactManager.get()
    for (let contact in allContacts) {
      let content = JSON.parse(allContacts[contact].content)
      if (contact !== name) {
        if (publicKey && content.publicKey === publicKey) {
          throw new Error(`The contact "${contact}" is already associated to this public key`)
        } else if (url && content.url === url) {
          throw new Error(`The contact "${contact}" is already associated to this url`)
        }
      } else {
        if (publicKey && content.publicKey !== publicKey) {
          throw new Error(`"${contact}" is associated to a different public key. Verify your contact, please`)
        }
      }
    }
  }

  async update(options) {
    let name = options.name = options.update
    let existingDataIfSo = this.contactManager.get(name)
    if (!existingDataIfSo) {
      throw new Error('Contact not found')
    }
    let publicKey
    let url
    if (process.env.NODE_ENV === 'test') {
      publicKey = options.publicKey
      url = options.url
    } else {
      let choice = await this.useSelect({
        message: 'Chose method',
        choices: ['Public key', 'Url on hub']
      })
      if (choice === 'Url on hub') {

        url = await this.useInput(Object.assign(options, {
          message: `Paste ${name}'s url on hub`
        }))
        if (!url) {
          throw new Error('Operation canceled')
        }
        try {
          publicKey = await this.getPublicKeyFromUrl(url)
        } catch (e) {
        }
      } else {
        publicKey = await this.useInput(Object.assign(options, {
          message: `Paste ${name}'s public key`
        }))
      }
      if (!publicKey) {
        throw new Error(choice === 'Url on hub' ? 'Url not active' : 'Operation canceled')
      }
    }
    if (!publicKey) {
      publicKey = JSON.parse(existingDataIfSo.content).publicKey
    }
    this.checkIfAlreadyExists(name, publicKey, url)
    if (existingDataIfSo) {
      await this.contactManager.remove(name)
    }
    await this.createContact(Object.assign(options, {publicKey, url}))
    return `The contact "${name}" has been updated`
  }

  async rename(options) {
    let [existentName, newName] = options.rename
    if (!this.contactManager.get(existentName)) {
      throw new Error(`A contact named "${existentName}" does not exist`)
    }
    if (this.contactManager.get(newName)) {
      throw new Error(`A contact named "${newName}" already exists`)
    }
    let error = this.contactManager.validateName(newName)
    if (error) {
      throw new Error(error)
    }
    if (await this.contactManager.rename(existentName, newName)) {
      return chalk.grey(`The contact "${existentName}" has been renamed "${newName}"`)
    } else {
      throw new Error(`Could not rename "${existentName}"`)
    }
  }

  async delete(options) {
    let existentContact = options.delete
    if (!this.contactManager.get(existentContact)) {
      throw new Error(`A contact named "${existentContact}" does not exist`)
    }
    if (await this.contactManager.remove(existentContact)) {
      return chalk.grey(`The contact "${existentContact}" has been deleted`)
    } else {
      throw new Error(`Could not delete "${existentContact}"`)
    }
  }

  async list(options) {
    let list = []
    let contacts = this.contactManager.get()
    for (let contact in contacts) {
      let content = JSON.parse(contacts[contact].content)
      list.push([contact, content])
    }
    return list
  }

  formatContact(l) {
    let result = [
      chalk.bold(l[0]),
      '\n',
      chalk.grey('public key: '),
      l[1].publicKey
    ]
    if (l[1].url) {
      result.push(
          '\n',
          chalk.grey('url: '),
          l[1].url
      )
    }
    return result.join('')
  }

  async show(options) {
    let contact = options.show
    let content = ((await this.contactManager.get()[contact]) || {}).content
    if (!content) {
      throw new Error(`A contact named "${contact}" is not in your trusted circle`)
    }
    content = JSON.parse(content)
    return options.asIs ? Object.assign(content, {contact}) : this.formatContact([contact, content])
  }

  async contacts(options) {
    if (!this.contactManager) {
      this.contactManager = new ContactManager(this.secrez.cache)
    }
    if (options.list) {
      let contacts = await this.list(options)
      if (options.asIs) {
        return contacts
      }
      if (contacts.length) {
        for (let i = 0; i < contacts.length; i++) {
          contacts[i] = this.formatContact(contacts[i])
        }
        return contacts
      } else {
        return 'No contacts found'
      }
    } else if (options.add) {
      return this.add(options)
    } else if (options.update) {
      return this.update(options)
    } else if (options.show) {
      return this.show(options)
    } else if (options.rename) {
      return this.rename(options)
    } else if (options.delete) {
      return this.delete(options)
    } else {
      throw new Error('Missing parameters. Run "contacts -h" to see examples.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!Object.keys(options).length) {
        options.list = true
      }
      this.validate(options)
      let result = await this.contacts(options)
      if (!Array.isArray(result)) {
        result = [result]
      }
      for (let r of result) {
        this.Logger.reset(r)
      }

    } catch (e) {
      // console.log(e)
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Contacts


