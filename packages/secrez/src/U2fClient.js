const u2f = require('u2f')
const U2FHost = require('u2f-host-node').U2FHost

class U2fClient {

  constructor(props) {
    this.appId = 'https://secrez.github.com/secrez'
  }

  discover() {
    this.host = U2FHost.discover()
  }

  async register() {
    let registration
    try {
      const regRequest = u2f.request(this.appId)
      // console.info('reqRequest', regRequest)
      console.info('Touch the key to register...')
      const data = await this.host.register(regRequest)
      // console.info('register', data)
      registration = u2f.checkRegistration(regRequest, data)
      console.info('registration', registration)
      this.registration = registration
    } catch (e) {
      console.error(e)
    }

  }

  async sign() {
    const signRequest = u2f.request(this.appId, this.registration.keyHandle)
    console.info('signRequest', signRequest)
    try {
      // console.info('signRequest', signRequest)
      console.info('Touch the key to sign...')
      const data = await this.host.authenticate(signRequest)
      console.info('sign', data)

      const verified = u2f.checkSignature(signRequest, data, this.registration.publicKey)
      console.info('verified', verified)
    } catch (e) {
      console.error(e)
    }
  }

}

module.exports = U2fClient
