const http = require('http')
const https = require('https')
const path = require('path')
const chai = require('chai')
const fs = require('fs-extra')
const assert = chai.assert
const superagent = require('superagent')
const {TLS} = require('@secrez/tls')
const {Secrez, Crypto} = require('@secrez/core')
const {sleep, base58ToInt} = require('@secrez/utils')
const {createServer, utils} = require('@secrez/hub')
const {isValidRandomId} = utils
const Config = require('../src/Config')
const Server = require('../src/Server')
const pkg = require('../package.json')
const WebSocket = require('ws')

const {publicKey1, publicKey2} = require('./fixtures')

describe.only('Server', async function () {

  let localDomain = 'localhost'
  let courierRoot = path.resolve(__dirname, '../tmp/test/.secrez-courier')
  let secrezDir1 = path.resolve(__dirname, '../tmp/test/.secrez1')
  let secrezDir2 = path.resolve(__dirname, '../tmp/test/.secrez2')
  let config
  let secrez1 = new Secrez()
  let secrez2 = new Secrez()
  let server
  let hubServer

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

  beforeEach(async function () {
    await fs.emptyDir(secrezDir1)
    await secrez1.init(secrezDir1)
    await secrez1.signup('password1', 8)
    await fs.emptyDir(secrezDir2)
    await secrez2.init(secrezDir2)
    await secrez2.signup('password2', 9)
    await fs.emptyDir(courierRoot)
    await startHub()
    config = new Config({root: courierRoot, hub: `http://${localDomain}:4433`})
    server = new Server(config)
    await server.start()
  })

  afterEach(async function () {
    await server.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(10)
  })

  it('should build an instance and start the server', async function () {
    assert.equal(server.localhost, `https://${localDomain}:${server.port}`)
    try {
      const res = await superagent.get(`${server.localhost}`)
          .set('Accept', 'application/json')
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Unauthorized')
    }

  })

  it('should accept /admin requests with auth-code', async function () {

    const authCode = server.authCode
    const payload = JSON.stringify({
      some: 'thing',
      publicKey: secrez1.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    const signature = secrez1.signMessage(payload)

    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    assert.isFalse(res.body.success)
    assert.equal(res.body.message, 'Wrong action')

  })

  it('should publish to the hub', async function () {

    const authCode = server.authCode
    const payload = JSON.stringify({
      id: 0,
      action: {
        name: 'publish'
      },
      publicKey: secrez1.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    const signature = secrez1.signMessage(payload)

    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    let result = res.body.tunnelUrl.split('//')[1].split('.')
    assert.isTrue(isValidRandomId(result[0], JSON.parse(payload).publicKey))
    assert.isTrue(res.body.success)
  })

  it('should add a publickey to the trusted circle', async function () {

    const authCode = server.authCode
    const payload = JSON.stringify({
      action: {
        name: 'add',
        publicKeys: [
          publicKey1,
          publicKey2
        ]
      },
      publicKey: secrez1.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    const signature = secrez1.signMessage(payload)

    const res = await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    assert.isTrue(res.body.success)
  })

  it('should receive a message from a public key in the trusted circle', async function () {

    const authCode = server.authCode
    const publicKey1 = secrez1.getPublicKey()
    const publicKey2 = secrez2.getPublicKey()

    let payload = JSON.stringify({
      action: {
        name: 'add',
        publicKeys: [
          secrez2.getPublicKey()
        ]
      },
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    let signature = secrez1.signMessage(payload)

    await superagent.get(`${server.localhost}/admin`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    let message = 'Hello, my friend.'
    let encryptedMessage = secrez2.encryptSharedData(message, publicKey1)

    payload = JSON.stringify({
      message: {
        sentAt: Date.now(),
        content: encryptedMessage
      },
      publicKey: secrez2.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez2.signMessage(payload)

    const params = {
      payload,
      signature
    }

    let res = await superagent.post(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .query({cc: 44})
        .send(params)
        .ca(await server.tls.getCa())

    assert.isTrue(res.body.success)
    let ts = parseInt(res.body.value.substring(20))
    assert.isTrue(Date.now() - ts < 200)

    payload = JSON.stringify({
      since: 0,
      from: [publicKey2],
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = JSON.parse(res.body.result[0].content).message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    payload = JSON.stringify({
      since: 0,
      from: [publicKey2],
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = JSON.parse(res.body.result[0].content).message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    payload = JSON.stringify({
      since: Date.now() - 1000,
      from: 0,
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = JSON.parse(res.body.result[0].content).message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

  })

  it('should throw if calling /admin with missing or wrong auth-code', async function () {

    try {
      const res = await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Unauthorized')
    }

    try {
      const res = await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .set('auth-code', 'somecode')
          .ca(await server.tls.getCa())
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Unauthorized')
    }

  })

})
