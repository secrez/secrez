const http = require('http')
const https = require('https')
const path = require('path')
const chai = require('chai')
const fs = require('fs-extra')
const assert = chai.assert
const request = require('superagent')
const {TLS} = require('@secrez/tls')
const {sleep} = require('@secrez/utils')
const {createServer, utils} = require('@secrez/hub')
const {isValidRandomId} = utils
const Config = require('../src/Config')
const Server = require('../src/Server')
const pkg = require('../package.json')

const fixtures = require('./fixtures')


describe.only('Server', async function () {

  let localDomain = 'localhost'
  let root = path.resolve(__dirname, '../tmp/test/config')
  let config

  let hubServer

  process.env.AS_DEV = true

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

  beforeEach(async function () {
    await fs.emptyDir(root)
    await startHub()
    config = new Config({root})
  })

  afterEach(async function () {
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(10)
  })

  it('should build an instance and start the server', async function () {

    let server = new Server(config)
    await server.start()
    const authCode = server.authCode
    const res = await request.get(`https://${localDomain}:${server.port}`)
        .set('auth-code', authCode)
        .ca(await server.tls.getCa())
    console.log(res.body.welcome_to, 'Secrez Courier v' + pkg.version)

  })

  it('should accept authorized requests', async function () {

    let server = new Server(config)
    await server.start()
    const authCode = server.authCode
    const res = await request.get(`https://${localDomain}:${server.port}`)
        .set('auth-code', authCode)
        .ca(await server.tls.getCa())
    console.log(res.body.welcome_to, 'Secrez Courier v' + pkg.version)

  })

})