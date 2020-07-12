const path = require('path')
const fs = require('fs-extra')

const {execAsync} = require('@secrez/utils')

class TLS {

  constructor(options = {}) {
    if (!options.destination || !fs.existsSync(options.destination)) {
      throw new Error('A folder where to save the data is required')
    }
    let defaults = {
      authority: 'Secrez-Root-CA',
      name: 'localhost',
      state: 'California',
      city: 'San Francisco',
      organization: 'Secrez-Certificates',
      v3ext: path.resolve(__dirname, '../v3.ext'),
      ca: 'ca'
    }
    this.options = Object.assign(defaults, options)
    if (!fs.existsSync(this.options.v3ext)) {
      throw new Error('The v3ext file does not exist')
    }
  }

  async generateCertificates() {
    let ready = await execAsync('which', __dirname, ['openssl'])
    /* istanbul ignore if  */
    if (!ready.message || ready.code !== 0) {
      throw new Error('openssl is required. Install it, please')
    }
    let error = 0
    let result = await execAsync(
        'openssl',
        this.options.destination,
        [
          'req',
          '-x509',
          '-nodes',
          '-new',
          '-sha256',
          '-days',
          '1024',
          '-newkey',
          'rsa:2048',
          '-keyout',
          'ca.key',
          '-out',
          'ca.pem',
          '-subj',
          `"/C=US/CN=${this.options.authority}"`
        ]
    )
    error += result.code
    result = await execAsync(
        'openssl',
        this.options.destination,
        [
          'x509',
          '-outform',
          'pem',
          '-in',
          'ca.pem',
          '-out',
          `${this.options.ca}.crt`
        ]

    )
    error += result.code
    result = await execAsync(
        'openssl',
        this.options.destination,
        [
          'req',
          '-new',
          '-nodes',
          '-newkey',
          'rsa:2048',
          '-keyout',
          `"${this.options.name}.key"`,
          '-out',
          `"${this.options.name}.csr"`,
          '-subj',
          `"/C=US/ST=${this.options.state}/L=${this.options.city}/O=${this.options.organization}/CN=${this.options.name}"`
        ]
    )
    error += result.code
    result = await execAsync(
        'openssl',
        this.options.destination,
        [
          'x509',
          '-req',
          '-sha256',
          '-days',
          '1024',
          '-in',
          `"${this.options.name}.csr"`,
          '-CA',
          'ca.pem',
          '-CAkey',
          'ca.key',
          '-CAcreateserial',
          '-extfile',
          this.options.v3ext,
          '-out',
          `"${this.options.name}.crt"`
        ]
    )
    error += result.code
    if (error !== 0) {
      throw new Error('Something went wrong. Check your params')
    }
    return true
  }

  async certificatesExist() {
    let sslFiles = await fs.readdir(this.options.destination)
    for (let f of [
      `${this.options.name}.crt`,
      `${this.options.name}.key`,
      `${this.options.ca}.crt`
    ]) {
      if (!sslFiles.includes(f)) {
        return false
      }
    }
    return true
  }

  async getFile(crt) {
    return fs.readFile(path.join(this.options.destination, crt), 'utf8')
  }

  async getCert() {
    return this.getFile(`${this.options.name}.crt`)
  }

  async getKey() {
    return this.getFile(`${this.options.name}.key`)
  }

  async getCa() {
    return this.getFile(`${this.options.ca}.crt`)
  }

}

module.exports = TLS
