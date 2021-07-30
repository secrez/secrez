const request = require('supertest')
const path = require('path')
const fs = require('fs-extra')
const chai = require('chai')
const assert = chai.assert
const {Server} = require('ws')
const WebSocketServer = Server
const WebSocket = require('ws')
const net = require('net')

process.env.DBDIR = path.resolve(__dirname, '../tmp/test/db')

let {setPayloadAndSignIt, isValidRandomId, resetDb} = require('../src/utils')
const Secrez = require('@secrez/core').Secrez(Math.random())

const createServer = require('../src/createServer')

describe('Server', () => {

  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

  let secrez
  fs.emptyDirSync(process.env.DBDIR)

  function setPayloadAndSignature(id = 0) {
    return setPayloadAndSignIt(secrez, {
      id
    })
  }

  beforeEach(async function () {
    await fs.emptyDir(rootDir)
    resetDb()
    secrez = new Secrez()
    await secrez.init(rootDir)
    await secrez.signup('password', 1000)
  })

  it('server starts and stops', async function () {
    const server = await createServer()
    await new Promise(resolve => server.listen(resolve))
    await new Promise(resolve => server.close(resolve))
  })

  it('should show the welcome json', async function () {
    const server = await createServer()
    const res = await request(server).get('/')
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.welcome_to, 'This is a Secrez hub')
  })

  it.skip('should upgrade websocket requests', async function () {

    const hostname = 'uz-3ms-cm'
    const server = await createServer({
      domain: 'example.com',
      port: 9699,
    })
    await new Promise(resolve => server.listen(resolve))

    const res = await request(server).get(`/${hostname}`)

    const localTunnelPort = res.body.port

    const wsS = await new Promise((resolve) => {
      const wsServer = new WebSocketServer({port: 0}, function () {
        resolve(wsServer)
      })
    })

    const websocketServerPort = wsS.address().port

    const ltSocket = net.createConnection({port: localTunnelPort})
    const wsSocket = net.createConnection({port: websocketServerPort})
    ltSocket.pipe(wsSocket).pipe(ltSocket)

    wsS.once('connection', (ws) => {
      ws.once('message', (message) => {
        ws.send(message)
      })
    })

    const ws = new WebSocket('ws://localhost:' + server.address().port, {
      headers: {
        host: hostname + '.example.com',
      }
    })

    ws.on('open', function () {
      ws.send('something')
    })

    await new Promise((resolve) => {
      ws.once('message', (msg) => {
        assert.equal(msg, 'something')
        resolve()
      })
    })

    wsS.close()
    await new Promise(resolve => server.close(resolve))
  })

  it('should create a tunnel and support the /api/v1/tunnels/:id/status endpoint', async function () {
    const code = 'asdcfde'
    const server = await createServer({
      code
    })
    await new Promise(resolve => server.listen(resolve))

    // no such tunnel yet
    let res = await request(server).get('/api/v1/tunnels/foobar-test/status')
    assert.equal(res.statusCode, 404)

    const {payload, signature} = setPayloadAndSignature()
    res = await request(server).get('/api/v1/tunnel/new').query({
      payload,
      signature
    })

    let {id} = res.body

    assert.isTrue(await isValidRandomId(id, secrez.getPublicKey()))

    res = await request(server).get(`/api/v1/tunnels/${id}/status?code=${code}`)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {
      connected_sockets: 0,
    })

    res = await request(server).get(`/api/v1/publickey/${id}`)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {
      publickey: secrez.getPublicKey()
    })

    await new Promise(resolve => server.close(resolve))
  })

  it('should support the /api/v1/tunnels/:id/status endpoint with same id', async function () {

    // process.env.AS_DEV = true

    const code = 'asdcfde'
    const server = await createServer({
      code
    })
    await new Promise(resolve => server.listen(resolve))

    // not authorized
    let res = await request(server).get('/api/v1/tunnels/foobar-test/status')
    assert.equal(res.statusCode, 404)


    // no such tunnel yet
    res = await request(server).get(`/api/v1/tunnels/foobar-test/status?code=${code}`)
    assert.equal(res.statusCode, 404)

    // request a new client called foobar-test
    const {payload, signature} = setPayloadAndSignature()

    res = await request(server).get('/api/v1/tunnel/new').query({
      payload,
      signature
    })

    let {id} = res.body

    const {payload: payload1, signature: signature1} = setPayloadAndSignature()
    res = await request(server).get('/api/v1/tunnel/new').query({
      payload: payload1,
      signature: signature1
    })

    let {id: newId} = res.body

    assert.equal(id, newId)

    res = await request(server).get(`/api/v1/tunnels/${id}/status?code=${code}`)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {
      connected_sockets: 0,
    })

    try {
      // reusing the same payload is not allowed
      res = await request(server).get('/api/v1/tunnel/new').query({
        payload: payload1,
        signature: signature1,
        keepShortUrl: true
      })
      assert.isTrue(false)
    } catch(e) {
      assert.isTrue(!!e.message)
    }

    await new Promise(resolve => server.close(resolve))
  })

  it('should reset the id when asked', async function () {

    // process.env.AS_DEV = true

    const code = 'asdcfde'
    const server = await createServer({
      code
    })
    await new Promise(resolve => server.listen(resolve))

    // request a new client called foobar-test
    const {payload, signature} = setPayloadAndSignature()

    let res = await request(server).get('/api/v1/tunnel/new').query({
      payload,
      signature
    })

    let {id} = res.body

    const {payload: payload1, signature: signature1} = setPayloadAndSignature()
    res = await request(server).get('/api/v1/tunnel/new').query({
      payload: payload1,
      signature: signature1,
      reset: true
    })

    let {id: newId} = res.body

    assert.notEqual(id, newId)

    await new Promise(resolve => server.close(resolve))
  })
})
