const https = require('https')
const localtunnel = require('@secrez/tunnel')
const {sleep, Debug} = require('@secrez/utils')
const {Crypto} = require('@secrez/core')
const {TLS} = require('@secrez/tls')
const Config = require('./Config')
const Db = require('./Db')

const debug = Debug('courier:server')
const App = require('./App')

class Server {

  constructor(config) {
    if (config.constructor.name  === 'Config') {
      this.config = config
    } else {
      throw new Error('Server requires a Config instance during construction')
    }
    this.options = config.options
    this.messages = []
    this.latest = -1
    this.tls = new TLS({
      destination: this.options.certsPath
    })
    this.db = new Db(this.options.dbPath)
    this.tunnelActive = false
  }

  async publish(payload, signature) {

    if (!this.tunnelActive) {
      let ssl = await this.getCertificates()
      let opts = {
        host: this.options.hub,
        port: this.port,
        payload,
        signature,
        // local_host: '127zero0one.com',
        local_https: true,
        local_cert: ssl.cert,
        local_key: ssl.key,
        local_ca: ssl.ca,
        allow_invalid_cert: false,
        timeout: 5
      }

      this.tunnel = await localtunnel(opts)

      if (this.tunnel.clientId) {
        this.tunnelActive = true
        this.tunnel.on('close', this.onTunnelClose)
        return {
          clientId: this.tunnel.clientId,
          url: this.tunnel.url,
          short_url: this.tunnel.short_url
        }
      } else {
        this.tunnel.close()
        return {
          error: 'Tunnel server offline',
          hub: this.options.hub
        }
      }
    }
  }

  async onTunnelClose() {
    this.tunnelActive = false
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

    await this.db.init()
    let authCode
    if (!this.options.newAuthCode) {
      authCode = await this.db.getValueFromConfig('authcode')
    }
    if (!authCode) {
      authCode = Crypto.getRandomBase32String(8)
      await this.db.saveKeyValueToConfig('authcode', authCode)
    }
    process.env.AUTH_CODE = this.authCode = authCode

    let port = this.options.port
    if (!port) {
      port = await this.db.getValueFromConfig('port')
    }
    if (this.options.newRandomPort) {
      port = undefined
    }

    const options = await this.getCertificates()
    const app = new App(this)

    this.httpsServer = https.createServer(options, app.app)
    this.port = await new Promise(resolve => {
      const onListen = () => {
        const {port} = this.httpsServer.address()
        resolve(port)
      }
      let params = [port ? port : onListen]
      if (port) {
        params.push(onListen)
      }
      this.httpsServer.listen(...params)
    })

    await this.db.saveKeyValueToConfig('port', this.port)

    this.localhost = `https://localhost:${this.port}`

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

    if (process.env.NODE_ENV !== 'test') {

      process.on('SIGINT', () => {
        debug('SIGINT signal received.')
        process.exit(0)
      })

      process.on('exit', () => {
        debug('Closing connections...')
        if (this.tunnelActive) {
          this.tunnel.close()
        }
        debug('Closed.')
      })
    }
  }

  async close() {
    if (this.tunnel) {
      this.tunnel.close()
    }
    await new Promise(resolve => this.httpsServer.close(resolve))
  }

}

module.exports = Server
