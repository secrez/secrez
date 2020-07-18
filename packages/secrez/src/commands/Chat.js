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

  async chat(options) {
    const env = options.env = await ConfigUtils.getEnv()
    if (env.courier) {
      const {authCode, port, caCrt} = env.courier
      if (!(await this.callCourier({name: 'ready'}, authCode, port, caCrt, '/admin')).success) {
        throw new Error("A courier is configured, but either it's not listening or the Auth Code is changed or it has been taken by another account")
      }
    } else {
      this.Logger.grey(`Chat requires a courier listening locally.
In another terminal window install @secrez/courier with 

  npm i -g @secrez/courier
  
and launch it with 

  secrez-courier
  
It will show an Auth Code, copy it and come back to Secrez. Then run "conf --init-courier" to connect it.`)
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


