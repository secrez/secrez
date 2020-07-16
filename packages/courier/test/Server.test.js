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

const {publicKey1, publicKey2, sendMessage} = require('./fixtures')

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

    try {
      await superagent.get(`${server.localhost}/admin`)
          .set('Accept', 'application/json')
          .set('auth-code', authCode)
          .query({payload, signature})
          .ca(await server.tls.getCa())
    } catch(e) {
      assert.equal(e.message, 'Bad Request')
    }

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

  it.only('should receive a message from a public key in the trusted circle', async function () {

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

    let res = await sendMessage(message, publicKey1, secrez2, server)
    assert.isTrue(res.body.success)

    await sendMessage('Ciao bello', publicKey1, secrez2, server)
    await sendMessage('How is it going?', publicKey1, secrez2, server)

    payload = JSON.stringify({
      from: publicKey2,
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())

    encryptedMessage = res.body.result[0].message.content

    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    payload = JSON.stringify({
      from: publicKey2,
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    payload = JSON.stringify({
      minTimestamp: parseInt((Date.now() - 1000)/1000),
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, publicKey1))

    await sleep(1000)

    await sendMessage('And what?', publicKey1, secrez2, server)

    payload = JSON.stringify({
      maxTimestamp: parseInt(Date.now()/1000) - 1,
      publicKey: publicKey1,
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez1.signMessage(payload)

    res = await superagent.get(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .set('auth-code', authCode)
        .query({payload, signature})
        .ca(await server.tls.getCa())
    encryptedMessage = res.body.result[0].message.content

    assert.equal(res.body.result.length, 3)
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
