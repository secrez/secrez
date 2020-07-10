const path = require('path')
const fs = require('fs-extra')

const {execAsync} = require('@secrez/utils')
const Config = require('./Config')

class TLS {

  constructor(config) {
    if (config instanceof Config) {
      this.config = config
    } else {
      throw new Error('TLS requires a Config instance during construction')
    }
    this.ssl = path.join(this.config.options.root, 'ssl')
  }

  async generateCertificates() {
    let result = await execAsync(
        './generate-certificates.sh',
        path.resolve(__dirname, '../scripts'),
        ['-d', this.ssl]
    )
    return result.code === 0
  }

  async certificatesExist() {
    let sslFiles = await fs.readdir(this.ssl)
    for (let f of TLS.ssls) {
      if (!sslFiles.includes(f)) {
        return false
      }
    }
    return true
  }

  async getCrt(crt) {
    return fs.readFile(path.join(this.ssl, crt), 'utf8')
  }

  async getLocalhostCrt() {
    return this.getCrt('localhost.crt')
  }

  async getLocalhostKey() {
    return this.getCrt('localhost.key')
  }

  async getRootCACrt() {
    return this.getCrt('ca.crt')
  }

}

TLS.ssls = [
  'localhost.crt',
  'localhost.key',
  'ca.crt'
]


module.exports = TLS
