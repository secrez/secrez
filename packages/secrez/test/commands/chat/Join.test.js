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
      publicKeys['user' + i + 'x'] = prompt.secrez.getPublicKey()
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

    await noPrint(C.courier.courier({
      port: server.port
    }))
    await noPrint(C.chat.chat({
      chatPrompt: new ChatPrompt
    }))
    D = C.chat.chatPrompt.commands
    await noPrint(D.contacts.exec({
      add: 'user0x',
      publicKey: publicKeys.user0x
    }))
    await noPrint(D.contacts.exec({
      add: 'user1x',
      publicKey: publicKeys.user1x
    }))
    await noPrint(D.contacts.exec({
      add: 'user2x',
      publicKey: publicKeys.user2x
    }))
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

  it('should join a chat with user0x', async function () {

    await noPrint(
        D.join.join({
          chat: 'user0x'
        }))
    assert.equal(C.chat.room[0].contact, 'user0x')
  })

  it('should join a chat with user0x', async function () {

    await noPrint(
        D.join.join({
          chat: 'user0x'
        }))
    assert.equal(C.chat.room[0].contact, 'user0x')
  })

  it('should jump between chats', async function () {

    await noPrint(D.join.join({
      chat: 'user0x'
    }))

    await noPrint(D.join.exec({
      chat: 'user1x'
    }))

    assert.equal(C.chat.room[0].contact, 'user1x')

  })

  it('should return all the users', async function () {

    let all = await D.join.customCompletion({}, undefined, undefined)

    assert.equal(all.join(','), 'user0x,user1x,user2x')

    all = await D.join.customCompletion({
      chat: ['user1']
    }, undefined, 'chat')

    assert.equal(all.join(','), 'user1x')

  })

  it('should throw if contact not found or multiple chat', async function () {

    try {
      await D.join.join({})
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Missing parameters')
    }

    try {
      await D.join.join({
        chat: ['user0x', 'user1x']
      })
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Multiple chat not supported yet')
    }

    try {
      await D.join.join({
        chat: 'nobody'
      })
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'Contact not found')
    }

  })


})

