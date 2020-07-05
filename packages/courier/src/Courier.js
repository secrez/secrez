const TLS = require('./TLS')
const Server = require('./Server')
const Config = require('./Config')

class Courier {

  constructor(options = {}) {
    this.config = new Config(options)
    this.tls = new TLS(this.config)
    this.server = new Server(this.config)
  }

  async init(force) {
    if (!(await this.tls.certificatesExist())) {
      await this.tls.generateCertificates()
    }
    return this.server.start()
  }
}

module.exports = Courier
