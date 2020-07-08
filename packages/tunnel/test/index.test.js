/* eslint-disable no-console */

const crypto = require('crypto')
const http = require('http')
const https = require('https')
const chai = require('chai')
const assert = chai.assert
const request = require('superagent')
const {Crypto} = require('@secrez/core')
const {sleep} = require('@secrez/utils')
const {createServer} = require('@secrez/hub')

const {payload, signature} = require('./fixtures')

const localtunnel = require('../index')

let fakePort

describe('tunnel', async function () {

  before(done => {
    const server = http.createServer()
    server.on('request', (req, res) => {
      res.write(req.headers.host)
      res.end()
    })
    server.listen(() => {
      const {port} = server.address()
      fakePort = port
      done()
    })
  })

  let server

  beforeEach(async function () {
    server = createServer({
      secure: false,
      domain: 'pass4.us',
      port: 9494
    })
    await new Promise(resolve => {
      server.listen(9494, () => {
        console.log('server listening on port: %d', server.address().port)
        resolve()
      })
    })
  })

  afterEach(async function () {
    await new Promise(resolve => server.close(resolve))
  })

  it.only('query localtunnel server w/ ident', async function () {

    this.timeout(10000)
    const tunnel = await localtunnel({port: fakePort, local_host: 'pass4.us', host: 'http://localhost:9494', payload, signature})

    assert.isTrue(new RegExp('^http://.*localhost:9494$').test(tunnel.url))

    // await sleep(10000)
      let res = await request
          .get(tunnel.url)
          .set('Host', 'pass4.us')

      console.log(111, res)

      assert.isTrue(/.*[.]pass4.us/.test(res.text))
      //

    // await sleep(10000)

  })

  it('request specific domain', async function () {
    const subdomain = Crypto.getRandomBase58String(7)
    const tunnel = await localtunnel({port: fakePort, subdomain})
    assert.ok(new RegExp(`^https://${subdomain}.secrez.cc$`).test(tunnel.url))
    tunnel.close()
  })

  describe('--local-host localhost', async function () {
    it('override Host header with local-host', async function () {

      const tunnel = await localtunnel({port: fakePort, local_host: 'pass4.us'})
      assert.isTrue(new RegExp('^https://.*secrez.cc$').test(tunnel.url))

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
            assert.equal(body, 'localhost')
            tunnel.close()
            resolve()
          })

        })
        req.end()
      })
    })
  })

  describe('--local-host 127.0.0.1', async function () {
    it('override Host header with local-host', async function () {
      const tunnel = await localtunnel({port: fakePort, local_host: '127.0.0.1'})
      assert.ok(new RegExp('^https://.*secrez.cc$').test(tunnel.url))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: {
          host: parsed.hostname,
        },
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
            assert.equal(body, '127.0.0.1')
            tunnel.close()
            resolve()
          })

        })

        req.end()
      })
    })

    it('send chunked request', async function () {
      const tunnel = await localtunnel({port: fakePort, local_host: '127.0.0.1'})
      assert.ok(new RegExp('^https://.*secrez.cc$').test(tunnel.url))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: {
          host: parsed.hostname,
          'Transfer-Encoding': 'chunked',
        },
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
            assert.equal(body, '127.0.0.1')
            tunnel.close()
            resolve()
          })
        })

        req.end(crypto.randomBytes(1024 * 8).toString('base64'))
      })
    })
  })

})
