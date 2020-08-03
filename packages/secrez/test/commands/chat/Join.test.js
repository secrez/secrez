const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')

const {sleep} = require('@secrez/utils')
const {createServer} = require('@secrez/hub')
const {Config, Server} = require('@secrez/courier')

const MainPrompt = require('../../mocks/MainPromptMock')
const ChatPrompt = require('../../mocks/ChatPromptMock')

const {noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../../fixtures')

describe('#Join', function () {

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
  let hubServer

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
    await noPrint(C.contacts.exec({
      add: 'user1',
      publicKey: publicKeys.user1
    }))
    await noPrint(C.contacts.exec({
      add: 'user2',
      publicKey: publicKeys.user2
    }))
    await noPrint(C.chat.chat({
      chatPrompt: new ChatPrompt
    }))
    D = C.chat.chatPrompt.commands
  })

  afterEach(async function () {
    await server.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(30)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await D.join.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should join a chat with user0', async function () {

    await noPrint(
        D.join.join({
      chat: 'user0'
    }))
    assert.equal(C.chat.room[0].contact, 'user0')
  })

  it('should jump between chats', async function () {

    await noPrint(D.join.join({
      chat: 'user0'
    }))

    await noPrint(D.join.join({
      chat: 'user1'
    }))

    assert.equal(C.chat.room[0].contact, 'user1')

  })

  it('should throw if contact not found or multiple chat', async function () {

    try {
      await D.join.join({
        chat: 'nobody'
      })
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Contact not found')
    }

    try {
      await D.join.join({
        chat: ['user0', 'user1']
      })
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Multiple chat not supported yet')
    }

  })


})

