const {sleep} = require('@secrez/utils')
const {ConfigUtils} = require('@secrez/core')

class Conf extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.courier = {
      _self: this
    }
    this.cliConfig.completion.help.courier = true
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
      description: ['Configure the connection to a local courier'],
      examples: [
        'courier'
      ]
    }
  }

  async publishToHubIfNotYet(options) {
    try {
      const {port, caCrt} = options.env.courier
      let id = options.env.courier.tunnel ? options.env.courier.tunnel.clientId : 0
      this.prompt.loadingMessage = 'Publishing the courier'
      this.prompt.loading()
      let res = await this.callCourier({
            action: {
              name: 'publish'
            },
            id
          },
          port,
          caCrt,
          '/admin'
      )
      this.prompt.showLoading = false
      await sleep(100)
      try {
        process.stdout.clearLine()
      } catch(e) {
        // most likely we are running workspace testing
      }
      if (res.info.error) {
        throw new Error(`The connection to the hub ${res.info.hub} is refused. Verify that your Secrez Courier is connecting to an active hub, please, and try again.`)
      } else {
        return res.info
      }
    } catch (e) {
      // console.error(e)
      throw new Error(e.message)
    }
  }

  async isCourierReady(options) {
    if (!options.env) {
      options.env = await ConfigUtils.getEnv(this.secrez.config)
    }
    if (options.env.courier) {
      const {port, caCrt} = options.env.courier
      return await this.callCourier({action: {name: 'ready'}}, port, caCrt, '/admin')
    } else {
      throw new Error('No courier set up yet.')
    }
  }

  async getRecentMessages(options = {}) {
    const env = await ConfigUtils.getEnv(this.secrez.config)
    if (!env.messages) {
      env.messages = {}
    }
    this.lastRead = env.messages.lastRead || 0
    if (env.courier) {
      const {port, caCrt} = env.courier
      const payload = Object.assign({
        minTimestamp: this.lastRead
      }, options)
      let messages = await this.callCourier(payload, port, caCrt, '/messages')
      for (let message of messages.result) {
        this.lastRead = Math.max(this.lastRead, message.timestamp + 1)
      }
      env.messages.lastRead = this.lastRead
      await ConfigUtils.putEnv(this.secrez.config, env)
      return messages.result.map(e => this.decryptMessage(e))
    } else {
      throw new Error('No courier set up yet.')
    }
  }

  async getSomeMessages(options = {}) {
    const env = await ConfigUtils.getEnv(this.secrez.config)
    if (env.courier) {
      const {port, caCrt} = env.courier
      const payload = options.payload
      let messages = await this.callCourier(payload, port, caCrt, '/messages')
      return messages.result.map(e => this.decryptMessage(e))
    } else {
      throw new Error('No courier set up yet.')
    }
  }

  decryptMessage(message) {
    message.decrypted = this.secrez.decryptSharedData(JSON.parse(message.payload).message, message.publickey)
    return message
  }

  async preInit(options) {
    const env = options.env
    let ready
    if (env.courier && env.courier.port) {
      let body = await this.isCourierReady(options)
      ready = body.success
      if (ready) {
        env.courier.caCrt = body.caCrt
        if (!body.tunnel.url) {
          body.tunnel = await this.publishToHubIfNotYet(options)
        }
        env.courier.tunnel = body.tunnel
        await ConfigUtils.putEnv(this.secrez.config, env)
        options.ready = true
      }
    }
  }

  async initCourier(options) {
    const env = options.env = await ConfigUtils.getEnv(this.secrez.config)
    await this.preInit(options)
    if (process.env.NODE_ENV === 'test') {
      return await this.setUpCorier(options)
    }
    if (options.ready) {
      this.Logger.reset(`A courier is already set and is listening on port ${env.courier.port}`)
    } else {
      let yes = await this.useConfirm({
        message: 'No Secrez Courier configured yet.\nDid you launch one?',
        default: true
      })
      if (yes) {
        options.port = await this.useInput({
          message: 'Which port the courier is listening to?'
        })
        if (options.port) {
          await this.setUpCorier(options)
        } else {
          this.Logger.grey('Operation canceled')
        }
      } else {
        this.Logger.grey('Operation canceled')
      }
    }
  }

  async setUpCorier(options) {
    const port = options.port
    try {
      const body = await this.callCourier({action: {name: 'ready'}}, port, undefined, '/admin')
      if (body.success) {
        let previousTunnel
        if (options.env.courier && options.env.courier.port === port) {
          previousTunnel = options.env.courier.tunnel
        }
        options.env.courier = {
          port,
          caCrt: body.caCrt,
          tunnel: previousTunnel
        }
        body.tunnel = await this.publishToHubIfNotYet(options)
        options.env.courier.tunnel = body.tunnel
        await ConfigUtils.putEnv(this.secrez.config, options.env)
        this.Logger.reset('Connected')
      } else {
        throw new Error('Courier not found')
      }
    } catch(e) {
      throw new Error('Courier not available')
    }
  }

  async courier(options) {
    return this.initCourier(options)
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      await this.courier(options)
    } catch (e) {
      // console.error(e)
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Conf


