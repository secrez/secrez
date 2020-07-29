const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')

const {ConfigUtils} = require('@secrez/core')
const {sleep} = require('@secrez/utils')
const {createServer, utils: hubUtils} = require('@secrez/hub')
const {Config, Server} = require('@secrez/courier')

const ContactManager = require('../../../src/Managers/ContactManager')

const MainPrompt = require('../../mocks/MainPromptMock')
const ChatPrompt = require('../../mocks/ChatPromptMock')

const {assertConsole, noPrint, decolorize} = require('../../helpers')

const {
  password,
  iterations
} = require('../../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../../helpers/jlog')

describe('#Help', function () {

  let prompt
  let hubPort = 4433
  let testDir = path.resolve(__dirname, '../../../tmp/test')
  let rootDir = path.resolve(testDir, 'secrez')
  let courierRoot = path.resolve(testDir, 'secrez-courier')
  let localDomain = '127zero0one.com'
  let inspect
  let C, D
  let config
  let server
  let secrez
  let publicKeys = {}

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
    ContactManager.getCache().reset()
    await fs.emptyDir(testDir)
    await startHub()
    config = new Config({root: courierRoot, hub: `http://${localDomain}:${hubPort}`})
    server = new Server(config)
    await server.start()
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    secrez = prompt.secrez
    await noPrint(C.courier.courier({
      authCode: server.authCode,
      port: server.port
    }))
    await noPrint(C.contacts.exec({
      add: 'user0',
      publicKey: publicKeys.user0
    }))
    await noPrint(C.chat.chat({
      chatPrompt: new ChatPrompt
    }))
    D = C.chat.chatPrompt.commands
  })

  afterEach(async function () {
    await server.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(10)
  })


  it('should return the help', async function () {

    inspect = stdout.inspect()
    await D.help.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/Available command/.test(output[1]))

  })

})

