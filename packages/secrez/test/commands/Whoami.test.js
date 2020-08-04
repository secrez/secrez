const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')

const {ConfigUtils} = require('@secrez/core')
const {sleep} = require('@secrez/utils')
const {createServer} = require('@secrez/hub')
const {Config, Server} = require('@secrez/courier')

const MainPrompt = require('../mocks/MainPromptMock')
const ChatPrompt = require('../mocks/ChatPromptMock')

const {noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Whoami', function () {

  let prompt
  let hubPort = 4433
  let testDir = path.resolve(__dirname, '../../tmp/test')
  let rootDir = path.resolve(testDir, 'secrez')
  let courierRoot = path.resolve(testDir, 'secrez-courier')
  let localDomain = '127zero0one.com'
  let inspect
  let C
  let config
  let server
  let secrez
  let publicKeys = {}
  let hubServer

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
    hubServer = createServer({
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

  let options = {
    container: rootDir,
    localDir: __dirname
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
    await noPrint(C.courier.courier({
      port: server.port
    }))
    await noPrint(C.contacts.exec({
      add: 'user0',
      publicKey: publicKeys.user0
    }))
    await noPrint(C.chat.chat({
      chatPrompt: new ChatPrompt
    }))
  })

  afterEach(async function () {
    await server.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(10)
  })


  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.whoami.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should see who am I', async function () {

    inspect = stdout.inspect()
    await C.whoami.exec({})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))

    assert.equal(output.length, 4)
    const env = await ConfigUtils.getEnv(secrez.config)
    assert.equal(output[0], 'Public key: ' + secrez.getPublicKey())
    assert.equal(output[1], 'Hub url: ' + env.courier.tunnel.url)
    assert.equal(output[2], 'Hub & public key short url: ' + env.courier.tunnel.short_url)
    assert.equal(output[3], 'For your convenience, the short url has been copied to the clipboard.')

  })


})

