const fs = require('fs-extra')
const path = require('path')
const https = require('https')
const localtunnel = require('@secrez/tunnel')
const {sleep, Debug, intToBase58} = require('@secrez/utils')
const {Crypto, Secrez} = require('@secrez/core')
const {DataCache} = require('@secrez/fs')
const {TLS} = require('@secrez/tls')
const Config = require('./Config')
const Db = require('./Db')

const debug = Debug('courier:server')
const App = require('./App')

class Server {

  // async onTunnelClose() {
  //   try {
  //     console.info('Tunnel closed')
  //   } catch (e) {
  //   }
  // }
  //
  constructor(config) {
    if (config instanceof Config) {
      this.config = config
    } else {
      throw new Error('Server requires a Config instance during construction')
    }
    this.options = config.options
    this.messages = []
    this.latest = -1
    process.env.AUTH_CODE = this.authCode = Crypto.getRandomBase58String(8)
    this.tls = new TLS({
      destination: this.options.certsPath
    })
    this.db = new Db(this.options.dbPath)
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

    return this.tunnel.url
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

  async initCache() {
    this.cache = new DataCache(path.join(this.options.root, 'cache'))
    await this.cache.load('latest')
    await this.cache.load('publickey')
    await this.cache.load('message')
    await this.cache.load('archive')
  }

  async start(prefix) {

    await this.db.init()

    const options = await this.getCertificates()
    const app = new App(this)

    this.httpsServer = https.createServer(options, app.app)
    this.port = await new Promise(resolve => {
      this.httpsServer.listen(() => {
        const {port} = this.httpsServer.address()
        resolve(port)
      })
    })

    this.localhost = `https://${this.options.local || 'localhost'}:${this.port}`

    this.httpsServer.on('error', error => {
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

    this.httpsServer.on('listening', () => {
      const addr = this.httpsServer.address()
      const bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port
      debug('Listening on ' + bind)
    })

    process.on('SIGINT', () => {
      debug('SIGINT signal received.')

      server.close(async function (err) {
        if(err) {
          debug('ERROR', err)
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        }
        await sleep(100)
        // eslint-disable-next-line no-process-exit
        process.exit(0)
      })
    })

    process.on("exit", () => {
      debug('Closing connections...')
      // this.db.db.close()
      this.httpsServer.close()
      debug('Closed.')
    })
  }

  async close() {
    await new Promise(resolve => this.httpsServer.close(resolve))
  }

}

module.exports = Server
