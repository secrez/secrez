const Fido2Client = require('../utils/Fido2Client')
const _ = require('lodash')
const Case = require('case')
const {sleep} = require('@secrez/utils')
const {Crypto, config, ConfigUtils} = require('@secrez/core')
const chalk = require('chalk')

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
      const {authCode, port, caCrt} = options.env.courier
      let id = options.env.courier.tunnel ? options.env.courier.tunnel.clientId : 0
      this.prompt.loadingMessage = 'Publishing the courier'
      this.prompt.loading()
      let res = await this.callCourier({
            action: {
              name: 'publish'
            },
            id
          },
          authCode,
          port,
          caCrt,
          '/admin'
      )
      this.prompt.showLoading = false
      await sleep(100)
      process.stdout.clearLine()
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
      const {authCode, port, caCrt} = options.env.courier
      return await this.callCourier({action: {name: 'ready'}}, authCode, port, caCrt, '/admin')
    } else {
      throw new Error('No courier set up yet.')
    }
  }

  async preInit(options) {
    const env = options.env
    let ready
    if (env.courier && env.courier.port) {
      let body = await this.isCourierReady(options)
      ready = body.success
      if (!ready) {
        delete env.courier
        await ConfigUtils.putEnv(this.secrez.config, env)
      } else {
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
        message: 'No Secrez Courier found. If you launched it, do you have the auth code?',
        default: false
      })
      if (yes) {
        options.fullAuthCode = await this.useInput({
          message: 'Paste the auth code'
        })
        if (options.fullAuthCode) {
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
    const port = options.port || options.fullAuthCode.substring(8)
    const authCode = options.authCode || options.fullAuthCode.substring(0, 8)
    const body = await this.callCourier({action: {name: 'ready'}}, authCode, port, undefined, '/admin')

    if (body.success) {
      options.env.courier = {
        authCode,
        port,
        caCrt: body.caCrt
      }
      if (!body.tunnel.url) {
        body.tunnel = await this.publishToHubIfNotYet(options)
      }
      options.env.courier.tunnel = body.tunnel
      await ConfigUtils.putEnv(this.secrez.config, options.env)
      this.Logger.reset(`Connected with the courier listening on port ${port}`)
    } else {
      this.Logger.red('The auth-code is not correct. Try again, please.')
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


