const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const superagent = require('superagent')
const fs = require('fs-extra')
const path = require('path')

const {ConfigUtils} = require('@secrez/core')
const {sleep} = require('@secrez/utils')
const {createServer, utils: hubUtils} = require('@secrez/hub')
const {Config, Server} = require('@secrez/courier')

const MainPrompt = require('../../../src/prompts/MainPromptMock')
const ChatPrompt = require('../../../src/prompts/ChatPromptMock')

const {noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../../fixtures')

describe('#Send', function () {

  let prompt
  let hubPort = 4433
  let testDir = path.resolve(__dirname, '../../../tmp/test')
  let rootDir = path.resolve(testDir, 'secrez')
  let rootDir2 = path.resolve(testDir, 'secrez2')
  let courierRoot = path.resolve(testDir, 'secrez-courier')
  let courierRoot2 = path.resolve(testDir, 'secrez-courier2')

  let localDomain = '127zero0one.com'
  let inspect
  let C, D
  let config, config2
  let server, server2
  let secrez
  let secrez2 = new (require('@secrez/core').Secrez())
  let publicKeys = {}
  let hubServer
  let res

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  before(async function () {
    for (let i = 0; i < 3; i++) {
      await fs.emptyDir(testDir)
      prompt = new MainPrompt
      await prompt.init(options)
      await prompt.secrez.signup(password, iterations)
      publicKeys['user' + i] = prompt.secrez.getPublicKey()
    }
  })

  const startHub = async () => {
    hubServer = await createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: hubPort
    })
    await new Promise(resolve => {
      hubServer.listen(hubPort, () => {
        resolve()
      })
    })
  }

  beforeEach(async function () {
    await fs.emptyDir(testDir)
    await startHub()
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    secrez = prompt.secrez
    config = new Config({root: courierRoot, hub: `http://${localDomain}:${hubPort}`, owner: secrez.getPublicKey()})
    server = new Server(config)
    await server.start()
    await secrez2.init(rootDir2)
    await secrez2.signup('password2', 9)
    config2 = new Config({root: courierRoot2, hub: `http://${localDomain}:${hubPort}`, owner: secrez2.getPublicKey()})
    server2 = new Server(config2)
    await server2.start()

    const {payload: payload0, signature: signature0} = hubUtils.setPayloadAndSignIt(secrez2, {
      action: {
        name: 'publish'
      }
    })

    res = await superagent
        .get(`${server2.localhost}/admin`)
        .set('Accept', 'application/json')
        .query({payload: payload0, signature: signature0})
        .ca(await server2.tls.getCa())

    await noPrint(C.courier.courier({
      port: server.port
    }))
    await noPrint(C.contacts.exec({
      add: 'user0',
      publicKey: secrez2.getPublicKey(),
      url: res.body.info.url
    }))

    await noPrint(C.chat.chat({
      chatPrompt: new ChatPrompt
    }))

    D = C.chat.chatPrompt.commands

    const env = await ConfigUtils.getEnv(secrez.config)

    const {payload, signature} = hubUtils.setPayloadAndSignIt(secrez2, {
      action: {
        name: 'add',
        publicKey: secrez.getPublicKey(),
        url: env.courier.tunnel.url
      }
    })

    await superagent
        .get(`${server2.localhost}/admin`)
        .set('Accept', 'application/json')
        .query({payload, signature})
        .ca(await server2.tls.getCa())
  })

  afterEach(async function () {
    await server.close()
    await server2.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(30)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await D.send.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should send a message to user0', async function () {

    await noPrint(D.join.join({
      chat: 'user0'
    }))

    let message = 'Ciao bello!'

    await D.send.send({
      message
    })

    const sender = secrez.getPublicKey()

    const {payload: payload3, signature: signature3} = hubUtils.setPayloadAndSignIt(secrez2, {
      publickey: sender
    })

    res = await superagent
        .get(`${server2.localhost}/messages`)
        .set('Accept', 'application/json')
        .query({payload: payload3, signature: signature3})
        .ca(await server2.tls.getCa())

    let encryptedMessage = JSON.parse(res.body.result[0].payload).message
    assert.equal(message, secrez2.decryptSharedData(encryptedMessage, sender))

  })


})

