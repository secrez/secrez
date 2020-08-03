const {ConfigUtils} = require('@secrez/core')
const {Crypto} = require('@secrez/core')

class Join extends require('../../Command') {

  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.join = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.chatCompletion.help.join = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'chat',
        alias: 'c',
        defaultOption: true,
        multiple: true,
        type: String
      },
      {
        name: 'user',
        alias: 'u',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Manages joins.'],
      examples: [
        ['join pan', 'joins a conversation with the previously-added user "pan"'],
        ['/join ema', 'jumps from the current conversation to the a new one with "ema". Notice the initial slash to disambiguate the command.'],
        ['join 7uH1nwoXJ7... -u lester', 'joins a conversation with a public key not associated with an existing user, and creates the user lester for it'],
      ]
    }
  }

  async getAllUsers() {
    let all = await this.prompt.environment.prompt.commands.contacts.list({})
    if (all && all.length) {
      return all.map(e => e[0])
    }
    return []
  }

  async customCompletion(options, originalLine, defaultOption) {
    const existingUsers = await this.getAllUsers()
    if (options.chat) {
      let lastUser = options.chat[options.chat.length - 1]
      return existingUsers.filter(e => {
        return RegExp('^' + lastUser).test(e)
      })
    } else {
      return existingUsers
    }
  }

  async joinRoom(options) {
    const existingUsers = await this.getAllUsers({asIs: true})
    if (typeof options.chat === 'string') {
      options.chat = [options.chat]
    }
    if (options.chat.length > 1) {
      throw new Error('Multiple chat not supported yet')
    }
    if (!existingUsers.includes(options.chat[0])) {
      throw new Error('Contact not found')
    }
    let room = []
    for (let contact of options.chat) {
      room.push(await this.prompt.environment.prompt.commands.contacts.show({
        show: contact,
        asIs: true
      }))
    }
    this.prompt.environment.room = room
    this.prompt.start()
  }

  async join(options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.environment.prompt.commands.courier.preInit(options)
      if (options.ready) {
        if (options.user) {
          if (!Crypto.isValidSecrezPublicKey(options.chat||'')) {
            throw new Error('The passed public key is invalid')
          } else {
            options.add = [options.user, options.chat]
            await this.prompt.environment.prompt.commands.contacts.contacts(options)
            options.chat = options.user
          }
        }
        if (options.chat) {
          await this.joinRoom(options)
          if (!this.hint) {
            this.Logger.grey('In a room, by default, you send messages, but you can execute commands. If a message looks like a command, for example "join me tonight", disambiguate it by prefixing it with a slash, like "/join me tonight".')
            this.hint = true
          }
        }
      }
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      await this.join(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Join


