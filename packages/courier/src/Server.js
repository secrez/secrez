const fs = require('fs-extra')
const path = require('path')
const https = require('https')
const localtunnel = require('@secrez/tunnel')
const {sleep, Debug} = require('@secrez/utils')
const {Crypto} = require('@secrez/core')
const {TLS} = require('@secrez/tls')
const Config = require('./Config')
const PublicKeyManager = require('./PublicKeyManager')

const debug = Debug('courier:server')
const app = require('./app')

class Server {

  async onTunnelClose() {
    try {
      console.info('Tunnel closed')
    } catch (e) {
    }
  }

  constructor(config) {
    if (config instanceof Config) {
      this.config = config
    } else {
      throw new Error('Server requires a Config instance during construction')
    }
    this.options = config.options
    this.messages = []
    this.latest = -1
    this.authCode = Crypto.getRandomBase58String(8)
    this.tls = new TLS({
      destination: this.options.certsPath
    })
  }

  async publish(payload, signature) {

    let ssl = await this.getCertificates()

    let opts = {
      host: this.options.hub,
      port: this.port,
      payload,
      signature,
      local_host: this.localhost,
      local_https: true,
      local_cert: ssl.cert,
      local_key: ssl.key,
      local_ca: ssl.ca,
      allow_invalid_cert: false
    }

    this.tunnel = await localtunnel(opts)
    this.tunnel.on('close', () => {
      this.onTunnelClose()
    })

  }

  async getCertificates() {
    if (!(await this.tls.certificatesExist())) {
      await this.tls.generateCertificates()
    }
    return {
      key: await this.tls.getKey(),
      cert: await this.tls.getCert(),
      ca: await this.tls.getCa()
    }
  }

  async setUpCache() {
    this.cache = new DataCache(path.join(this.options.root, 'cache'))
    this.cache.initEncryption('publickey', 'message')
    await this.cache.load('publickey')
    PublicKeyManager.setCache(this.cache)
    this.publicKeyManager = new PublicKeyManager()
    await this.cache.load('message')
    PublicKeyManager.setCache(this.cache)
    this.publicKeyManager = new PublicKeyManager()
  }

  async start(prefix) {

    await this.setUpCache()

    const options = await this.getCertificates()
    const server = https.createServer(options, app(this.authCode))
    this.port = await new Promise(resolve => {
      server.listen(() => {
        const {port} = server.address()
        resolve(port)
      })
    })

    this.localhost = `https://${this.localHostname || 'localhost'}:${this.port}`

    server.on('error', error => {
      if (error.syscall !== 'listen') {
        throw error
      }
      const bind = typeof port === 'string'
          ? 'Pipe ' + this.port
          : 'Port ' + this.port
      switch (error.code) {
        case 'EACCES':
          debug(bind + ' requires elevated privileges')
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        case 'EADDRINUSE':
          debug(bind + ' is already in use')
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        default:
          throw error
      }
    })

    server.on('listening', () => {
      const addr = server.address()
      const bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port
      debug('Listening on ' + bind)
    })

  }

}

module.exports = Server
