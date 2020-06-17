const u2f = require('u2f')
const U2FHost = require('u2f-host-node').U2FHost
const {ConfigUtils} = require('@secrez/core')
const Logger = require('./utils/Logger')

class U2fClient {

  constructor(props) {
    this.appId = 'https://secrez.github.com/secrez'
    this.registrations = {}
  }

  async discover() {
    const env = await ConfigUtils.getEnv()
    if (env.u2fKeys) {
      this.registrations = env.u2fKeys.registrations
    }
    this.host = U2FHost.discover()
  }

  async register(name, message, save) {
    const regRequest = u2f.request(this.appId)
    Logger.grey(message)
    const data = await this.host.register(regRequest)
    let registration = u2f.checkRegistration(regRequest, data)
    this.registrations[name] = registration
    if (save) {
      this.registrations[name] = registration
      const env = await ConfigUtils.getEnv()
      if (!env.u2fKeys) {
        env.u2fKeys = {
          registrations: {}
        }
      }
      env.u2fKeys.registrations[name] = registration
      await ConfigUtils.putEnv(env)
    }
    return registration
  }

  list() {
    return Object.keys(this.registrations)
  }

  async sign(name, message) {
    let registration = typeof name === 'object'
        ? name // << it is a registration
        : this.registrations[name]
    const signRequest = u2f.request(this.appId, registration.keyHandle)
    Logger.grey(message)
    const data = await this.host.authenticate(signRequest)
    const verified = u2f.checkSignature(signRequest, data, registration.publicKey)
    if (verified.successful) {
      return data.signatureData
    }
    return false
  }

}

module.exports = U2fClient
