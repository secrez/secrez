const path = require('path')
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
    const {authCode, port, caCrt} = options.env.courier
    let users = await this.prompt.commands.contacts.contacts({list: true, asIs: true})
    for (let user of users) {
      console.log(await this.callCourier({
        action: {
          name: 'add',
          publicKey: user[1].publicKey,
          url: user[1].url
        }
      }, authCode, port, caCrt, '/admin'))
    }
  }

  async chat(options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      await this.prompt.commands.courier.preInit(options)
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
  
It will show an Auth Code, copy it and come back to Secrez. Then run "conf --init-courier" to configure the connection w/ the courier.`)
      throw new Error('Courier not found.')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      await this.chat(options)
    } catch (e) {
      // console.log(e)
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Chat


