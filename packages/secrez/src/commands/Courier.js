
// eslint-disable-next-line no-unused-vars
const {Server} = require('@secrez/courier')

const superagent = require('superagent')

class Courier extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.courier = {
      _func: this.selfCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.courier = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'auth-code',
        alias: 'a',
        defaultOption: true,
        type: String
      },
      {
        name: 'port',
        alias: 'p',
        type: String
      }
    ]
  }

  help() {
    return {
      description: [
        'Start the Secrez courier.'
      ],
      examples: [
        ['courier -a 3xR1BTWL', 'initializes the environment; the auth code is returned by secrez-listener, which means that you must run the listener in a separate terminal before executing this command. If you do not pass the parameter, Courier will ask for it.'],
        ['courier', 'continues an already initiated session.'],
        ['courier -p 8800', 'look for the secrez-listener on port 8800.']
      ]
    }
  }

  async onWatch(path) {

  }

  async get(qs = {}) {
    try {
      const res = await superagent
          .get(this.localUrl)
          .query(qs)
          .set('Accept', 'application/json')
      return JSON.parse(res.text)
    } catch (e) {
      throw new Error('Listener not found.')
    }
  }

  async courier(options = {}) {
    if (!this.localUrl || this.port !== this.localPort) {
      this.localPort = this.port || 9393
      this.localUrl = `http://127.0.0.1:${this.localPort}`
    }
    if (!options.authCode) {
      options.authCode = this.authCode
    }
    if (this.authCode) {
      // check if still valid
      let res
      try {
        res = await this.get({
          authCode: this.authCode
        })
      } catch (e) {
        throw new Error('Listener not found. Please launch it with "secrez-listener". If not installed yet, install it with "npm i -g @secrez/courier"')
      }
      if (res && res.success) {

        //


      } else {
        throw new Error('The authCode has been changed. Look at the terminal where you started secrez-listener for the current authCode.')
      }


    }


  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      /* istanbul ignore if  */
      this.validate(options)
      let result = await this.courier(options)
      this.Logger.reset(result)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Courier


