// Next line is to avoid that npm-check-unused reports it
require('pino-pretty')
//
const fs = require('fs-extra')
const path = require('path')
const localtunnel = require('@secrez/tunnel')
const {sleep} = require('@secrez/utils')
const {Crypto} = require('@secrez/core')
const Config = require('./Config')

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
      throw new Error('TLS requires a Config instance during construction')
    }
    this.options = config.options
    this.dataPath = path.join(config.options.root, 'data')
    this.messages = []
    this.latest = -1
    fs.ensureDirSync(this.dataPath)
    this.authCode = Crypto.getRandomBase58String(8)
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

  async start(prefix) {
    let logger = false

    if (this.options.printLog) {
      logger = require('pino')({
        prettyPrint: true
      })
    } else if (this.options.logToFile) {
      await fs.ensureDir(path.join(this.options.root, 'logs'))
      const logPath = path.join(this.options.root, 'logs/log.txt')
      logger = require('pino')(logPath)
    }

    this.fastify = require('fastify')({
      logger
    })

    this.fastify.register(require('fastify-graceful-shutdown'))

    this.fastify.register(require('fastify-ws'))

    this.fastify.route({
      method: 'POST',
      url: '/',
      preHandler: async (request, reply) => {
        //
      },
      handler: async (request, reply) => {
        return {hello: 'world'}
      }
    })

    this.fastify.route({
      method: 'GET',
      url: `/${this.authCode}`,
      handler: async (request, reply) => {

// Something

        return {
          hello: 'world'
        }
      }
    })


    this.fastify.route({
      method: 'GET',
      url: '*',
      handler: async (request, reply) => {
        return {
          hello: 'world'
        }
      }
    })

    function handle(conn) {
      conn.pipe(conn) // creates an echo server
    }

    this.fastify.register(require('fastify-websocket'), {
      handle,
      options: {
        maxPayload: 1048576,
        verifyClient: function (info, next) {
          if (info.req.headers['x-fastify-header'] !== this.authCode) {
            return next(false)
          }
          next(true)
        }
      }
    })

    this.fastify.get('/ws', {
      websocket: true
    }, async (connection, req) => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let latest = this.messages.length - 1
        if (latest > this.latest) {
          let messages = this.messages.slice(this.latest)
          this.latest = latest
          connection.socket.send(JSON.stringify(messages))
        }
        await sleep(500)
      }
    })

    try {
      await this.fastify.listen(this.options.port)
      this.fastify.gracefulShutdown((signal, next) => {
        next()
      })
    } catch (err) {
      this.onTunnelClose()
      this.fastify.log.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }

  }

}

module.exports = Server
