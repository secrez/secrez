/* eslint-disable no-console */

const crypto = require('crypto')
const http = require('http')
const https = require('https')
const chai = require('chai')
const assert = chai.assert
const request = require('superagent')
const {Crypto} = require('@secrez/core')
const {TLS} = require('@secrez/tls')
const {sleep} = require('@secrez/utils')
const {createServer, utils: hubUtils} = require('@secrez/hub')
const {isValidRandomId} = hubUtils

const fixtures = require('./fixtures')
const localDomain = fixtures.localhostDomain

const localtunnel = require('../index')
let fakePort = 7700

describe('tunnel', async function () {

  let expected = 'Hello'
  let baseOptions = {
    // local_host: '127zero0one.com',
    host: `http://${localDomain}:9494`
  }

  let localServer
  let hubServer
  let tunnel

  const startHub = async () => {
    hubServer = createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: 9494
    })
    await new Promise(resolve => {
      hubServer.listen(9494, () => {
        resolve()
      })
    })
  }

  const startLocalServer = async (options = {}) => {
    localServer = http.createServer(options)
    localServer.on('request', (req, res) => {
      res.write(expected)
      res.end()
    })
    return new Promise(resolve => {
      localServer.listen(++fakePort, () => {
        const {port} = localServer.address()
        fakePort = port
        resolve()
      })
    })
  }

  before(async function () {
    process.env.AS_DEV = true
  })

  beforeEach(async function () {
    // console.log('>>>>beforeEach')
    // await startLocalServer()
    // await startHub()
  })

  after(async function () {
    process.env.AS_DEV = false
  })

  afterEach(async function () {
    await new Promise(resolve => hubServer.close(resolve))
    await new Promise(resolve => localServer.close(resolve))
    await sleep(10)
    // console.log('>>>>afterEach')
  })

  it('query localtunnel server w/out ident', async function () {

    await startLocalServer()
    await startHub()

    const {payload, signature} = fixtures.randomId

    tunnel = await localtunnel(Object.assign(baseOptions, {port: fakePort, payload, signature}))

    let result = tunnel.url.split('//')[1].split('.')

    assert.isTrue(isValidRandomId(result[0], JSON.parse(payload).publicKey))
    assert.equal(result[1], localDomain.split('.')[0])

    // await sleep(5000)

    let res = await request.get(tunnel.url)
    assert.equal(res.text, expected)

    expected = 'Come on!'

    res = await request.get(tunnel.url)
    assert.equal(res.text, expected)

    tunnel.close()
  })

  it('query localtunnel server with ident', async function () {

    await startLocalServer()
    await startHub()

    expected = 'Enjoy!'

    const {payload, signature} = fixtures.fixedId

    tunnel = await localtunnel(Object.assign(baseOptions, {port: fakePort, payload, signature}))

    let result = tunnel.url.split('//')[1].split('.')

    assert.isTrue(isValidRandomId(result[0], JSON.parse(payload).publicKey))
    assert.equal(result[1], localDomain.split('.')[0])

    const res = await request.get(tunnel.url)
    assert.equal(res.text, expected)

    tunnel.close()
  })

  it('query localtunnel server from an SSL localhost', async function () {

    expected = 'Azzo'

    const {payload, signature} = fixtures.fixedId

    tunnel = await localtunnel(Object.assign(baseOptions, {port: fakePort, payload, signature}))

    let result = tunnel.url.split('//')[1].split('.')

    assert.isTrue(isValidRandomId(result[0], JSON.parse(payload).publicKey))
    assert.equal(result[1], localDomain.split('.')[0])

    const res = await request.get(tunnel.url)
    assert.equal(res.text, expected)

    tunnel.close()
  })

  describe.only('--local-host localhost', async function () {
    it('override Host header with local-host', async function () {

      const {payload, signature} = fixtures.randomId

      tunnel = await localtunnel(Object.assign(baseOptions, {port: fakePort, payload, signature}))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: {host: parsed.hostname},
        path: '/',
      }
      await new Promise(resolve => {
        const req = https.request(opt, res => {
          res.setEncoding('utf8')
          let body = ''

          res.on('data', chunk => {
            body += chunk
          })

          res.on('end', () => {
            assert.equal(body, '127zero0one.com')
            tunnel.close()
            resolve()
          })

        })
        req.end()
      })
    })
  })
  //
  // describe('--local-host 127.0.0.1', async function () {
  //   it('override Host header with local-host', async function () {
  //     const tunnel = await localtunnel({port: fakePort, local_host: '127.0.0.1'})
  //     assert.ok(new RegExp('^https://.*secrez.cc$').test(tunnel.url))
  //
  //     const parsed = new URL(tunnel.url)
  //     const opt = {
  //       host: parsed.host,
  //       port: 443,
  //       headers: {
  //         host: parsed.hostname,
  //       },
  //       path: '/',
  //     }
  //
  //     await new Promise(resolve => {
  //       const req = https.request(opt, res => {
  //         res.setEncoding('utf8')
  //         let body = ''
  //
  //         res.on('data', chunk => {
  //           body += chunk
  //         })
  //
  //         res.on('end', () => {
  //           assert.equal(body, '127.0.0.1')
  //           tunnel.close()
  //           resolve()
  //         })
  //
  //       })
  //
  //       req.end()
  //     })
  //   })
  //
  //   it('send chunked request', async function () {
  //     const tunnel = await localtunnel({port: fakePort, local_host: '127.0.0.1'})
  //     assert.ok(new RegExp('^https://.*secrez.cc$').test(tunnel.url))
  //
  //     const parsed = new URL(tunnel.url)
  //     const opt = {
  //       host: parsed.host,
  //       port: 443,
  //       headers: {
  //         host: parsed.hostname,
  //         'Transfer-Encoding': 'chunked',
  //       },
  //       path: '/',
  //     }
  //
  //     await new Promise(resolve => {
  //       const req = https.request(opt, res => {
  //         res.setEncoding('utf8')
  //         let body = ''
  //
  //         res.on('data', chunk => {
  //           body += chunk
  //         })
  //
  //         res.on('end', () => {
  //           assert.equal(body, '127.0.0.1')
  //           tunnel.close()
  //           resolve()
  //         })
  //       })
  //
  //       req.end(crypto.randomBytes(1024 * 8).toString('base64'))
  //     })
  //   })
  // })

})
