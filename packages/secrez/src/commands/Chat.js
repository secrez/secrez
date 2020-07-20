const {ConfigUtils} = require('@secrez/core')

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
    let users = await this.prompt.commands.user.user({list: true, asIs: true})
    let publicKeys = []
    for (let user of users) {
      publicKeys.push(user[1])
    }
    const {authCode, port, caCrt} = options.env.courier
    await this.callCourier({action: {name: 'add', publicKeys}}, authCode, port, caCrt, '/admin')
  }

  async chat(options) {
    const env = options.env = await ConfigUtils.getEnv()
    if (env.courier) {
      await this.prompt.commands.conf.preInit(options)
      if (options.ready) {
        await this.uploadUsersPublicKeysToCourier(options)
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
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Chat


