const {ConfigUtils} = require('@secrez/core')

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
      }
    ]
  }

  help() {
    return {
      description: ['Joins conversation.'],
      examples: [
        ['join pan', 'joins a conversation with the previously-added user "pan"']
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

  async customCompletion(options, originalLine, currentOption) {
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
    if (!options.chat) {
      throw new Error('Missing parameters')
    } else {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.environment.prompt.commands.courier.preInit(options)
      if (options.ready) {
          await this.joinRoom(options)
          if (!this.hint) {
            this.Logger.grey('In a room, by default, you send messages, but you can also execute commands. If a message looks like a command, for example "join me tonight", disambiguate it by prefixing it with a slash, like "/join me tonight".')
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


