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

describe('#Show', function () {

  let prompt1, prompt2
  let hubPort = 4433
  let testDir = path.resolve(__dirname, '../../../tmp/test')
  let rootDir = path.resolve(testDir, 'secrez')
  let rootDir2 = path.resolve(testDir, 'secrez2')
  let courierRoot = path.resolve(testDir, 'secrez-courier')
  let courierRoot2 = path.resolve(testDir, 'secrez-courier2')

  let localDomain = '127zero0one.com'
  let inspect
  let C, D, C2, D2
  let config, config2
  let server1, server2
  let secrez1, secrez2
  let hubServer

  let options1 = {
    container: rootDir,
    localDir: __dirname
  }

  let options2 = {
    container: rootDir2,
    localDir: __dirname
  }


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

    prompt1 = new MainPrompt
    await prompt1.init(options1)
    await prompt1.secrez.signup(password, iterations)
    secrez1 = prompt1.secrez
    config = new Config({root: courierRoot, hub: `http://${localDomain}:${hubPort}`})
    server1 = new Server(config)
    await server1.start()

    prompt2 = new MainPrompt
    await prompt2.init(options2)
    await prompt2.secrez.signup(password, iterations)
    secrez2 = prompt2.secrez
    config2 = new Config({root: courierRoot2, hub: `http://${localDomain}:${hubPort}`})
    server2 = new Server(config2)
    await server2.start()

    inspect = stdout.inspect()

    C = prompt1.commands

    await C.courier.courier({
      port: server1.port
    })

    C2 = prompt2.commands

    await C2.courier.courier({
      port: server2.port
    })

    let whoami1 = await C.whoami.whoami({asIs: true})
    let whoami2 = await C2.whoami.whoami({asIs: true})

    await C.contacts.contacts({
      add: 'bob',
      publicKey: secrez2.getPublicKey(),
      url: whoami2.url
    })

    await C2.contacts.contacts({
      add: 'alice',
      publicKey: secrez1.getPublicKey(),
      url: whoami1.url
    })

    await C.chat.chat({
      chatPrompt: new ChatPrompt
    })
    D = C.chat.chatPrompt.commands

    await C2.chat.chat({
      chatPrompt: new ChatPrompt
    })

    D2 = C2.chat.chatPrompt.commands

    inspect.restore()

  })

  afterEach(async function () {
    await server1.close()
    await server2.close()
    await new Promise(resolve => hubServer.close(resolve))
    await sleep(30)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await D.show.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should show history messages', async function () {

    this.timeout(5000)

    await noPrint(D.join.join({
      chat: 'bob'
    }))

    await noPrint(D2.join.join({
      chat: 'alice'
    }))

    let messages = [
      'Ciao',
      'Hi',
      'How are you?',
      'Well, and you?',
      'I am fine. Any news?',
      'I went to LA',
      'Mee too. Was it good?',
      'Yeah',
      'Glad to hear'
    ]

    await D.send.send({
      message: messages[0]
    })
    await D2.send.send({
      message: messages[1]
    })
    await D.send.send({
      message: messages[2]
    })
    await D2.send.send({
      message: messages[3]
    })
    await D.send.send({
      message: messages[4]
    })
    await D2.send.send({
      message: messages[5]
    })

    await sleep(1)

    let ts = Date.now()

    await sleep(1)

    await D.send.send({
      message: messages[6]
    })
    await D2.send.send({
      message: messages[7]
    })
    await D.send.send({
      message: messages[8]
    })
    await D.send.send({
      message: messages[9]
    })

    let results = (await D.show.show({
      asIs: true
    })).map(e => e.decrypted)

    assert.equal(results.length, 9)

    for (let i=0;i< results.length; i++) {
      assert.equal(messages[i], results[i])
    }

    results = (await D.show.show({
      asIs: true,
      from: [ts]
    })).map(e => e.decrypted)

    assert.equal(results.length, 3)

    for (let i=0;i< results.length; i++) {
      assert.equal(messages[i+6], results[i])
    }

    results = (await D.show.show({
      asIs: true,
      to: [ts]
    })).map(e => e.decrypted)

    assert.equal(results.length, 6)

    for (let i=0;i< 6; i++) {
      assert.equal(messages[i], results[i])
    }

  })


})

