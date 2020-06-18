const u2f = require('u2f')
const U2FHost = require('u2f-host-node').U2FHost
const Logger = require('./utils/Logger')

class U2fClient {

  constructor() {
    this.appId = 'https://secrez.io/cli'
    this.keys = {}
  }

  async updateConf(secrez) {
    const conf = await secrez.readConf()
    if (conf.data.keys) {
      let keys = conf.data.keys
      for (let signer in keys) {
        this.keys[signer] = keys[signer].registration
      }
    }
  }

  async discover(secrez) {
    await this.updateConf(secrez)
    this.host = U2FHost.discover()
  }

  list() {
    return Object.keys(this.keys)
  }

  async register(name, message, save) {
    const regRequest = u2f.request(this.appId)
    Logger.grey(message)
    const data = await this.host.register(regRequest)
    return u2f.checkRegistration(regRequest, data)
  }

  async sign(registration, message) {
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
