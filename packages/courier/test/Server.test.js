const path = require('path')
const chai = require('chai')
const fs = require('fs-extra')
const assert = chai.assert
const superagent = require('superagent')
const {Crypto} = require('@secrez/core')
const Secrez = require('@secrez/core').Secrez(Math.random())
const Secrez2 = require('@secrez/core').Secrez(Math.random())
const {sleep} = require('@secrez/utils')
const {createServer, utils: hubUtils} = require('@secrez/hub')
const {isValidRandomId, setPayloadAndSignIt, verifyPayload} = hubUtils
const Config = require('../src/Config')
const Server = require('../src/Server')

const {sendMessage} = require('./helpers')
const {publicKey1, publicKey2} = require('./fixtures')

const jlog = require('./helpers/jlog')

describe('Server', async function () {

  let localDomain = '127zero0one.com'
  let courierRoot = path.resolve(__dirname, '../tmp/test/secrez-courier')
  let courierRoot2 = path.resolve(__dirname, '../tmp/test/secrez-courier2')
  let secrezDir1 = path.resolve(__dirname, '../tmp/test/secrez1')
  let secrezDir2 = path.resolve(__dirname, '../tmp/test/secrez2')
  let config
  let config2
  let secrez1 = new Secrez()
  let secrez2 = new Secrez2()
  let server
  let server2
  let hubServer
  let hubServer2

  // process.env.AS_DEV = true

  const startHub = async () => {
    hubServer = createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: 4433
    })
    await new Promise(resolve => {
      hubServer.listen(4433, () => {
        resolve()
      })
    })
  }

  const startHub2 = async () => {
    hubServer2 = createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: 3344
    })
    await new Promise(resolve => {
      hubServer2.listen(3344, () => {
        resolve()
      })
    })
  }

  beforeEach(async function () {
    await fs.emptyDir(secrezDir1)
    await secrez1.init(secrezDir1)
    await secrez1.signup('password1', 8)
    await fs.emptyDir(secrezDir2)
    await secrez2.init(secrezDir2)
    await secrez2.signup('password2', 9)
    await fs.emptyDir(courierRoot)
    await fs.emptyDir(courierRoot2)
    await startHub()
    await startHub2()
    config = new Config({root: courierRoot, hub: `http://${localDomain}:4433`})
    server = new Server(config)
    await server.start()
    config2 = new Config({root: courierRoot2, hub: `http://${localDomain}:3344`})
    server2 = new Server(config2)
    await server2.start()
  })

  afterEach(async function () {
    await server.close()
    await server2.close()
    await new Promise(resolve => hubServer.close(resolve))
    await new Promise(resolve => hubServer2.close(resolve))
    await sleep(10)
  })

  it('should build an instance and start the server', async function () {
    assert.equal(server.localhost.replace(/localhost/, '127zero0one.com'), `https://${localDomain}:${server.port}`)
      let res = await superagent.get(`${server.localhost}`)
          .set('Accept', 'application/json')
          .ca(await server.tls.getCa())
    assert.equal(res.body.hello, 'world')
  })

  it('should accept /admin requests with auth-code', async function () {

    const authCode = server.authCode

    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      some: 'thing'
    })

    try {
      await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .set('auth-code', authCode)
          .query({payload, signature})
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Bad Request')
    }

  })

  it('should say if is ready', async function () {
    const authCode = server.authCode
    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'ready'
      }
    })
    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    assert.isTrue(res.body.success)
  })

  it('should publish to the hub', async function () {

    const authCode = server.authCode

    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'publish'
      }
    })

    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    assert.isTrue(/\/s\/\w{6}$/.test(res.body.info.short_url))

    let result = res.body.info.url.split('//')[1].split('.')
    assert.isTrue(isValidRandomId(result[0], JSON.parse(payload).publicKey))
    assert.isTrue(res.body.success)
  })

  it('should reuse port and authCode', async function () {

    let firstPort = server.port
    let authCode = server.authCode

    await server.close()
    config = new Config({root: courierRoot, hub: `http://${localDomain}:4433`})
    server = new Server(config)
    await server.start()

    assert.equal(firstPort, server.port)
    assert.equal(authCode, server.authCode)

    await server.close()
    config = new Config({root: courierRoot, hub: `http://${localDomain}:4433`, port: 9876})
    server = new Server(config)
    await server.start()

    assert.equal(9876, server.port)
    assert.equal(authCode, server.authCode)

  })

  it('should add a publickey to the trusted circle', async function () {

    const authCode = server.authCode

    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'add',
        publicKey: publicKey1,
        url: 'https://example.com'
      }
    })

    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    assert.isTrue(res.body.success)

  })

  it('should receive a message from a public key in the trusted circle', async function () {

    this.timeout(5000)

    const authCode = server.authCode

    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'publish'
      }
    })

    await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    const publicKey1 = secrez1.getPublicKey()
    const publicKey2 = secrez2.getPublicKey()

    const {payload: payload1, signature: signature1} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'add',
        publicKey: secrez2.getPublicKey()
      }
    })

    await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload: payload1, signature: signature1})
        .ca(await server.tls.getCa())

    let message = 'Hello, my friend.'

    let res = await sendMessage(message, publicKey1, secrez2, server)
    assert.isTrue(res.body.success)

    await sendMessage('Ciao bello', publicKey1, secrez2, server)
    await sendMessage('How is it going?', publicKey1, secrez2, server)

    const {payload: payload2, signature: signature2} = setPayloadAndSignIt(secrez1, {
      publickey: publicKey2
    })

    res = await superagent.get(`${server.localhost}/messages`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload: payload2, signature: signature2})
        .ca(await server.tls.getCa())

    let encryptedMessage = res.body.result[0].message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    const {payload: payload3, signature: signature3} = setPayloadAndSignIt(secrez1, {
      publickey: publicKey2
    })

    res = await superagent.get(`${server.localhost}/messages`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload: payload3, signature: signature3})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    const {payload: payload4, signature: signature4} = setPayloadAndSignIt(secrez1, {
      minTimestamp: parseInt((Date.now() - 1000) / 1000)
    })

    res = await superagent.get(`${server.localhost}/messages`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload: payload4, signature: signature4})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    await sleep(1000)

    await sendMessage('And what?', publicKey1, secrez2, server)

    const {payload: payload5, signature: signature5} = setPayloadAndSignIt(secrez1, {
      maxTimestamp: parseInt(Date.now() / 1000) - 1
    })

    res = await superagent.get(`${server.localhost}/messages`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload: payload5, signature: signature5})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))
  })

  it('should send a message to a public key in the trusted circle', async function () {

    this.timeout(10000)

    const authCode1 = server.authCode
    const authCode2 = server2.authCode
    const publicKey1 = secrez1.getPublicKey()
    const publicKey2 = secrez2.getPublicKey()

    const {payload, signature} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'publish'
      }
    })

    let res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode1)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    let info1 = res.body.info

    const {payload: payload0, signature: signature0} = setPayloadAndSignIt(secrez2, {
      action: {
        name: 'publish'
      }
    })

    res = await superagent.get(`${server2.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode2)
        .query({payload: payload0, signature: signature0})
        .ca(await server2.tls.getCa())

    let info2 = res.body.info

    const {payload: payload1, signature: signature1} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'add',
        publicKey: publicKey2,
        url: info2.url
      }
    })

    await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode1)
        .query({payload: payload1, signature: signature1})
        .ca(await server.tls.getCa())

    let message = 'Ciao amico mio'

    let encryptedMessage = secrez1.encryptSharedData(message, publicKey2)

    const {payload: payloadMessage, signature: signatureMessage} = setPayloadAndSignIt(secrez1, {
      message: {
        sentAt: Date.now(),
        content: encryptedMessage
      }
    })

    const {payload: payload2, signature: signature2} = setPayloadAndSignIt(secrez1, {
      action: {
        name: 'send',
        recipient: publicKey2,
        message: {
          payload: payloadMessage,
          signature: signatureMessage
        }
      }
    })

    res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode1)
        .query({payload: payload2, signature: signature2})
        .ca(await server.tls.getCa())

    assert.isTrue(res.body.success)

    const {payload: payload3, signature: signature3} = setPayloadAndSignIt(secrez2, {
      publickey: publicKey1
    })

    res = await superagent.get(`${server2.localhost}/messages`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode2)
        .query({payload: payload3, signature: signature3})
        .ca(await server2.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

  })

  it('should throw if calling /admin with missing or wrong auth-code', async function () {

    try {
      await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Unauthorized')
    }

    try {
      await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .set('auth-code', 'somecode')
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Unauthorized')
    }

  })

})
