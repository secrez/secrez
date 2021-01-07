const Koa = require('koa')
const {Debug} = require('@secrez/utils')
const http = require('http')
const Router = require('koa-router')
const {version} = require('../package.json')
const {Crypto} = require('@secrez/core')

const ClientManager = require('./lib/ClientManager')
const debug = Debug('hub:server')
const {getRandomId, isValidRandomId, verifyPayload, getClientIdFromHostname, getPublicKeyFromId, initDb} = require('./utils')

const oneMinute = 60 * 1000

async function createServer(opt) {
  opt = opt || {}

  await initDb()

  const landingPage = opt.landing

  const adminCode = opt.code

  const manager = new ClientManager(opt)

  const schema = opt.secure ? 'https' : 'http'

  const app = new Koa()
  const router = new Router()

  function error(ctx, code, message) {
    debug('Error %s "%s"', code, message)
    const result = {
      status_code: code,
      message: message
    }
    ctx.status = code
    ctx.body = result
  }

  router.get('/api/v1/status', async (ctx, next) => {
    let q = ctx.request.query
    if (!adminCode || (adminCode && q.code !== adminCode)) {
      error(ctx, 404, 'Not found')
      return
    }
    const stats = manager.stats
    ctx.body = {
      tunnels: stats.tunnels,
      mem: process.memoryUsage(),
    }
  })

  router.get('/api/v1/tunnels/:id/status', async (ctx, next) => {
    let q = ctx.request.query
    if (!adminCode || (adminCode && q.code !== adminCode)) {
      error(ctx, 404, 'Not found')
      return
    }
    const clientId = ctx.params.id
    const client = manager.getClient(clientId)
    if (!client) {
      error(ctx, 404, 'Not found')
      return
    }
    const stats = client.stats()
    ctx.body = {
      connected_sockets: stats.connectedSockets,
    }
  })

  router.get('/api/v1/tunnel/new', async (ctx, next) => {
    let payload, signature, publicKey, reset
    try {
      let q = ctx.request.query
      payload = q.payload
      signature = q.signature
      reset = q.reset
      let parsedPayload = JSON.parse(payload)
      publicKey = parsedPayload.publicKey
    } catch (e) {
      // console.log(e)
      error(ctx, 400, 'Wrong parameters')
      return
    }
    if (!Crypto.isValidSecrezPublicKey(publicKey)) {
      error(ctx, 400, 'Wrong public key')
      return
    }
    if (!verifyPayload(payload, signature, oneMinute, true)) {
      error(ctx, 400, 'Wrong signature')
      return
    }
    let reqId = await getRandomId(publicKey, reset)
    let info
    if (manager.hasClient(reqId)) {
      debug('returning existing client with id %s', reqId)
      info = manager.getClientInfo(reqId)
    } else {
      debug('making new client with id %s', reqId)
      info = await manager.newClient(reqId, debug)
    }
    const url = schema + '://' + info.id + '.' + ctx.request.host
    info.url = url
    ctx.body = info
  })

  router.get('/api/v1/publickey/:id', async (ctx, next) => {
    const id = ctx.params.id
    let publickey
    try {
      publickey = await getPublicKeyFromId(id)
      if (publickey) {
        ctx.status = 200
        ctx.body = {
          publickey
        }
        return
      }
    } catch (e) {
    }
    const result = {
      status_code: 404,
      message: 'Not found'
    }
    ctx.status = 404
    ctx.body = result
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  // root endpoint
  app.use(async (ctx, next) => {
    const path = ctx.request.path

    const hostname = ctx.request.headers.host

    // skip anything not on the root path
    if (path !== '/' || getClientIdFromHostname(hostname)) {
      await next()
      return
    }
    if (landingPage) {
      // no new client request, send to landing page
      ctx.redirect(landingPage)
    } else {
      ctx.body = {
        welcome_to: 'This is a Secrez hub',
        version,
        more_info_at: 'https://github.com/secrez/secrez'
      }
      return
    }
  })

  // anything after the / path is a request for a specific client name
  // This is a backwards compat feature
  app.use(async (ctx, next) => {
    const parts = ctx.request.path.split('/')

    const hostname = ctx.request.headers.host

    // any request with several layers of paths is not allowed
    // rejects /foo/bar
    // allow /foo
    if (parts.length !== 2 || getClientIdFromHostname(hostname)) {
      await next()
      return
    }

    const reqId = parts[1]

    if (!(await isValidRandomId(reqId))) {
      error(ctx, 400, 'Wrong requested id')
      return
    }

    debug('making new client with id %s', reqId)
    const info = await manager.newClient(reqId)

    const url = schema + '://' + info.id + '.' + ctx.request.host
    info.url = url

    ctx.body = info
    return
  })

  const server = http.createServer()

  const appCallback = app.callback()

  server.on('request', (req, res) => {
    // without a hostname, we won't know who the request is for

    const hostname = req.headers.host

    debug('hostname %s', hostname)

    if (!hostname) {
      res.statusCode = 400
      let result = {
        status_code: 400,
        message: 'Host header is required'
      }
      res.end(JSON.stringify(result))
      return
    }

    let clientId = getClientIdFromHostname(hostname)

    debug('clientId %s', clientId, hostname)

    if (!clientId) {
      appCallback(req, res)
      return
    }

    const client = manager.getClient(clientId)

    if (!client) {
      res.statusCode = 404
      let result = {
        status_code: 404,
        message: 'Not found'
      }
      res.end(JSON.stringify(result))
      return
    }

    client.handleRequest(req, res)
  })

  server.on('upgrade', (req, socket, head) => {

    const hostname = req.headers.host
    if (!hostname) {
      socket.destroy()
      return
    }

    const clientId = getClientIdFromHostname(hostname)
    if (!clientId) {
      socket.destroy()
      return
    }

    const client = manager.getClient(clientId)

    if (!client) {
      socket.destroy()
      return
    }

    client.handleUpgrade(req, socket)
  })

  return server
}

module.exports = createServer
