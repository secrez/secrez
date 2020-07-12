const fs = require('fs-extra')
const path = require('path')
const https = require('https')
const localtunnel = require('@secrez/tunnel')
const {sleep, Debug} = require('@secrez/utils')
const {Crypto} = require('@secrez/core')
const {TLS} = require('@secrez/tls')
const Config = require('./Config')

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

  async publish(options) {


    // const tunnel = await localtunnel({
    //   port: argv.port,
    //   host: argv.host,
    //   subdomain: argv.subdomain,
    //   local_host: argv.localHost,
    //   local_https: argv.localHttps,
    //   local_cert: argv.localCert,
    //   local_key: argv.localKey,
    //   local_ca: argv.localCa,
    //   allow_invalid_cert: argv.allowInvalidCert,
    // })

    this.tunnel = await localtunnel(options)
    //     {
    //   port: this.options.port,
    //   host: this.options.host
    // })
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

  async start(prefix) {

    const options = await this.getCertificates()
    const server = https.createServer(options, app(this.authCode))
    this.port = await new Promise(resolve => {
      server.listen(() => {
        const {port} = server.address()
        resolve(port)
      })
    })

    this.host = 'https://localhost:' + this.port

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
