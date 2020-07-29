const https = require('https')

const helpers = {

  startHttpsServer(key, cert) {
    const options = {
      key,
      cert
    }
    const server = https.createServer(options, (req, res) => {
      res.writeHead(200)
      res.end('hello world')
    }).listen(4435)
    return server
  },

  verifyTlsConnection(key, cert, ca) {
    const options = {
      hostname: 'localhost',
      port: 4435,
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
  }

}

module.exports = helpers
