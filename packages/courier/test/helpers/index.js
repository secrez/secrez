const https = require('https')
const superagent = require('superagent')
const {Crypto} = require('@secrez/core')
const {utils} = require('@secrez/hub')

const helpers = {

  startHttpsServer(key, cert) {
    const options = {
      key,
      cert
    }
    const server = https.createServer(options, (req, res) => {
      res.writeHead(200)
      res.end('hello world')
    }).listen(4433)
    return server
  },

  verifyTlsConnection(key, cert, ca) {
    const options = {
      hostname: 'localhost',
      port: 4433,
      path: '/',
      method: 'GET',
      ca
    }
    return new Promise(resolve => {
      const req = https.request(options, function (res) {
        res.on('data', function (data) {
          resolve(data)
        })
      })
      req.end()
    })
  },

  async sendMessage (message, publicKey1, secrez, server) {
    let encryptedMessage = secrez.encryptSharedData(message, publicKey1)

    const {payload, signature} = utils.setPayloadAndSignIt(secrez, {
      message: {
        sentAt: Date.now(),
        content: encryptedMessage
      }
    })

    const params = {
      payload,
      signature
    }

    return superagent.post(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .query({cc: 44})
        .send(params)
        .ca(await server.tls.getCa())
  }

}

module.exports = helpers
