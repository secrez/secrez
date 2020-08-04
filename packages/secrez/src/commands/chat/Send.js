const superagent = require('superagent')
const {utils: hubUtils} = require('@secrez/hub')
const {ConfigUtils} = require('@secrez/core')

class Send extends require('../../Command') {

  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.send = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.chatCompletion.help.send = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'message',
        alias: 'm',
        type: String,
        default: true
      }
    ]
  }

  help() {
    return {
      description: ['Sends either a room or the chat'],
      examples: [
        'send'
      ]
    }
  }

  async sendMessage (options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    if (!env.courier) {
      throw new Error('Courier configuration not found')
    }
    await this.prompt.environment.prompt.commands.courier.preInit(options)
    if (!options.ready) {
      throw new Error('Connection with the courier lost')
    }
    if (!this.prompt.environment.room) {
      throw new Error('No room active')
    }
    let recipient = this.prompt.environment.room[0].publicKey
    let encryptedMessage = this.secrez.encryptSharedData(options.message, recipient)
    const {payload: payloadMessage, signature: signatureMessage} = hubUtils.setPayloadAndSignIt(this.secrez, {
      message: encryptedMessage
    })
    const {payload: payload2, signature: signature2} = hubUtils.setPayloadAndSignIt(this.secrez, {
      action: {
        name: 'send',
        recipient,
        message: {
          payload: payloadMessage,
          signature: signatureMessage
        }
      }
    })
    return superagent.get(`https://localhost:${env.courier.port}/admin`)
        .set('Accept', 'application/json')
        .query({payload: payload2, signature: signature2})
        .ca(await env.courier.caCrt)
  }

  async send(options) {
    if (options.message) {
      let res = await this.sendMessage(options)
      if (!res.body.success) {
        throw new Error('Sending failed :o(')
      }
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!this.prompt.environment.room) {
        throw new Error('You not in a chat room')
      }
      this.validate(options)
      await this.send(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Send


