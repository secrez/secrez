const request = require('supertest')
const path = require('path')
const fs = require('fs-extra')
const chai = require('chai')
const assert = chai.assert
const {Server} = require('ws')
const WebSocketServer = Server
const WebSocket = require('ws')
const net = require('net')
const {Secrez, Crypto} = require('@secrez/core')

const createServer = require('../src/createServer')

describe.only('Server', () => {


  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let secrez = new Secrez()

  before(async function () {
    await fs.emptyDir(rootDir)
    await secrez.init(rootDir)
    await secrez.signup('password', 1000)
  })

  it('server starts and stops', async () => {
    const server = createServer()
    await new Promise(resolve => server.listen(resolve))
    await new Promise(resolve => server.close(resolve))
  })

  it('should show the welcome json', async () => {
    const server = createServer()
    const res = await request(server).get('/')
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.welcome_to, 'This is a Secrez hub')
  })

  it('should upgrade websocket requests', async () => {
    const hostname = 'websocket-test'
    const server = createServer({
      domain: 'example.com',
    })
    await new Promise(resolve => server.listen(resolve))

    const res = await request(server).get('/websocket-test')
    const localTunnelPort = res.body.port

    const wss = await new Promise((resolve) => {
      const wsServer = new WebSocketServer({port: 0}, () => {
        resolve(wsServer)
      })
    })

    const websocketServerPort = wss.address().port

    const ltSocket = net.createConnection({port: localTunnelPort})
    const wsSocket = net.createConnection({port: websocketServerPort})
    ltSocket.pipe(wsSocket).pipe(ltSocket)

    wss.once('connection', (ws) => {
      ws.once('message', (message) => {
        ws.send(message)
      })
    })

    const ws = new WebSocket('http://localhost:' + server.address().port, {
      headers: {
        host: hostname + '.example.com',
      }
    })

    ws.on('open', () => {
      ws.send('something')
    })

    await new Promise((resolve) => {
      ws.once('message', (msg) => {
        assert.equal(msg, 'something')
        resolve()
      })
    })

    wss.close()
    await new Promise(resolve => server.close(resolve))
  })

  it('should support the /api/v1/tunnels/:id/status endpoint', async () => {
    const server = createServer()
    await new Promise(resolve => server.listen(resolve))

    // no such tunnel yet
    let res = await request(server).get('/api/v1/tunnels/foobar-test/status')
    assert.equal(res.statusCode, 404)

    // request a new client called foobar-test
    const payload = JSON.stringify({
      id: 0,
      publicKey: secrez.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    const signature = secrez.signMessage(payload)

    res = await request(server).get('/api/v1/tunnel/new').query({
      payload,
      signature
    })

    let {id} = res.body
    assert.equal(id.substring(0, 4), Crypto.b58Hash(secrez.getPublicKey()).substring(0, 4).toLowerCase())

    res = await request(server).get(`/api/v1/tunnels/${id}/status`)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {
      connected_sockets: 0,
    })

    await new Promise(resolve => server.close(resolve))
  })
})
