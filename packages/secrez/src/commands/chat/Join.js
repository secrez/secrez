const chalk = require('chalk')
const {ConfigUtils} = require('@secrez/core')
const Secrez = require('@secrez/core').Secrez(Math.random())

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

  async customCompletion(options, originalLine, defaultOption) {
    const existingUsers = (await this.prompt.environment.prompt.commands.user.user({
      list: true,
      asIs: true
    })).map(e => e[0])
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
    if (options.chat.length > 1) {
      throw new Error('Multiple chat not supported yet')
    }
    this.prompt.environment.room = options.chat
  }

  async join(options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.environment.prompt.commands.conf.preInit(options)
      if (options.ready) {
        if (options.user) {
          if (!Secrez.isValidPublicKey(options.chat||'')) {
            throw new Error('The passed public key is invalid')
          } else {
            options.add = [options.user, options.chat]
            await this.prompt.environment.prompt.commands.user.user(options)
            options.chat = options.user
          }
        }
        if (options.chat) {
          await this.joinRoom(options)
          if (!this.hint) {
            this.Logger.grey('In the room, by default, you send messages. To execute any command, prefix it with a slash, like "/leave".')
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


