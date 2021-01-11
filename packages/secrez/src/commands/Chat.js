const path = require('path')
const chalk = require('chalk')
const {ConfigUtils} = require('@secrez/core')
const ChatPrompt = require('../prompts/ChatPrompt')

class Chat extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.chat = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.chat = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Enters the Secrez chat'],
      examples: [
        'chat'
      ]
    }
  }

  async uploadUsersPublicKeysToCourier(options) {
    const {port, caCrt} = options.env.courier
    let contacts = await this.prompt.commands.contacts.contacts({list: true, asIs: true})
    this.contactsByPublicKey = {}
    for (let contact of contacts) {
      this.contactsByPublicKey[contact[1].publicKey] = contact[0]
      await this.callCourier({
        action: {
          name: 'add',
          publicKey: contact[1].publicKey,
          url: contact[1].url
        }
      }, port, caCrt, '/admin')
    }
  }

  async readHistoryMessages(options = {}) {
    /* istanbul ignore if  */
    if (!options.asIs) {
      this.chatPrompt.skip = true
    }
    const {minTimestamp, maxTimestamp, from, to} = options
    /* istanbul ignore if  */
    if (!options.asIs) {
      this.Logger.bold(from || to ? `Messages${from ? ` from ${from}` : ''}${to ? ` to ${to}` : ''}:` : 'All message history:')
    }
    let newMessages = await this.prompt.commands.courier.getSomeMessages({
      payload: {
        minTimestamp,
        maxTimestamp,
        from: this.room[0].publicKey,
        limit: 1000
      }
    })
    /* istanbul ignore if  */
    if (!options.asIs) {
      let len = newMessages.length
      if (len) {
        this.chatPrompt.onMessages(newMessages, {
          fromHistory: true,
          verbose: options.verbose,
          lastLine: options.asIs ? undefined : chalk.grey(`${len} message${len > 1 ? 's' : ''} found.`)
        })
      } else {
        this.Logger.yellow('None found')
      }
      this.chatPrompt.skip = false
    } else {
      return newMessages
    }
  }

  async chat(options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      this.courier = await this.prompt.commands.courier
      await this.courier.preInit(options)
      if (options.ready) {
        await this.uploadUsersPublicKeysToCourier(options)
        if (process.env.NODE_ENV === 'test') {
          this.chatPrompt = options.chatPrompt
        } else {
          this.chatPrompt = new ChatPrompt
        }
        await this.chatPrompt.init({
          historyPath: path.join(this.secrez.config.localDataPath, 'chatHistory'),
          environment: this,
          secrez: this.secrez
        })
        await this.chatPrompt.run(options)
      } else {
        throw new Error('The configured courier is not responding.')
      }
    } else {
      this.Logger.grey(`Chat requires a courier listening locally.
If you haven't yet, in another terminal install @secrez/courier as 

  npm i -g @secrez/courier
  
and launch it as 

  secrez-courier
  
It will show the port where it is listening to. Copy it and come back to Secrez. Then run "courier" to configure the connection w/ the courier.`)
      throw new Error('Courier not found.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    // this.prompt.clearScreen.pause(true)
    try {
      await this.chat(options)
    } catch (e) {
      // console.log(e)
      this.Logger.red(e.message)
    }
    // this.prompt.clearScreen.pause(false)
    await this.prompt.run()
  }
}

module.exports = Chat


