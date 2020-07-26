const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const {utils: hubUtils} = require('@secrez/hub')
const MainPrompt = require('../mocks/PromptMock')
const ContactManager = require('../../src/Managers/ContactManager')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe.only('#Contacts', function () {

  let prompt
  let testDir = path.resolve(__dirname, '../../tmp/test')
  let rootDir = path.resolve(testDir, '.secrez')
  let inspect, C
  let publicKeys = {}

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
      publicKeys['contacts' + i] = prompt.secrez.getPublicKey()
    }
  })

  beforeEach(async function () {
    ContactManager.getCache().reset()
    await fs.emptyDir(testDir)
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.contacts.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('initialize correctly the ContactManager', async function () {

    inspect = stdout.inspect()
    await C.contacts.exec({
      list: true
    })
    inspect.restore()
    assertConsole(inspect, [])

    assert.equal(ContactManager.getCache().dataPath, path.join(rootDir, 'cache'))

  })

  it('returns my public key', async function () {

    inspect = stdout.inspect()
    await C.contacts.exec({
      myself: true
    })
    inspect.restore()
    assertConsole(inspect, [
      'Your public key:',
      prompt.secrez.getPublicKey()
    ])
  })

  it('create a contacts', async function () {

    inspect = stdout.inspect()
    await C.contacts.exec({
      add: 'contacts1',
      publicKey: publicKeys.contacts1
    })
    inspect.restore()
    assertConsole(inspect, `The contact "contacts1" has been added to your trusted contacts`)

  })

  it('create contacts and get their public keys', async function () {

    await noPrint(C.contacts.exec({
      add: 'contacts1',
      publicKey: publicKeys.contacts1
    }))

    inspect = stdout.inspect()
    await C.contacts.exec({
      add: 'contacts2',
      publicKey: publicKeys.contacts2
    })
    inspect.restore()
    assertConsole(inspect, `The contact "contacts2" has been added to your trusted contacts`)

    inspect = stdout.inspect()
    await C.contacts.exec({
      show: 'contacts1'
    })
    inspect.restore()
    assertConsole(inspect, [
      'contacts1',
      'public key: ' + publicKeys.contacts1
    ])

  })

  it('should list contacts', async function () {

    let randomId = hubUtils.getRandomId(publicKeys.contacts1)
    let url = `https://${randomId}.secrez.cc`

    await noPrint(C.contacts.contacts({
      add: 'contacts1',
      publicKey: publicKeys.contacts1,
      url
    }))

    await noPrint(C.contacts.exec({
      add: 'contacts2',
      publicKey: publicKeys.contacts2
    }))

    inspect = stdout.inspect()
    await C.contacts.exec({
      list: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/ +/g, ' '))
    assert.equal(output[0], 'contacts1\npublic key: ' + publicKeys.contacts1 + '\nurl: ' + url)

  })

  it('should update a contact', async function () {

    let randomId = hubUtils.getRandomId(publicKeys.contacts1)
    let url = `https://${randomId}.secrez.cc`

    await C.contacts.contacts({
      add: 'contacts1',
      publicKey: publicKeys.contacts1,
      url
    })

    assert.equal((await C.contacts.list())[0][1].url, url)

    randomId = hubUtils.getRandomId(publicKeys.contacts1)
    url = `https://${randomId}.secrez.cc`

    await C.contacts.contacts({
      update: 'contacts1',
      url
    })

    assert.equal((await C.contacts.list())[0][1].url, url)

  })

  it('should rename a contacts', async function () {

    await noPrint(C.contacts.exec({
      add: 'contacts1',
      publicKey: publicKeys.contacts1
    }))

    inspect = stdout.inspect()
    await C.contacts.exec({
      rename: ['contacts1', 'contactsA']
    })
    inspect.restore()
    assertConsole(inspect, 'The contact "contacts1" has been renamed "contactsA"')

  })

  it('should remove a contacts', async function () {

    await noPrint(C.contacts.exec({
      add: 'contacts1',
      publicKey: publicKeys.contacts1
    }))

    await noPrint(C.contacts.exec({
      add: 'contacts2',
      publicKey: publicKeys.contacts2

    }))

    inspect = stdout.inspect()
    await C.contacts.exec({
      delete: 'contacts1'
    })
    inspect.restore()
    assertConsole(inspect, 'The contact "contacts1" has been deleted')

    inspect = stdout.inspect()
    await C.contacts.exec({
      list: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/ +/g, ' '))
    assert.equal(output.length, 1)

  })


  it('should throw if there are errors', async function () {

    let randomId = hubUtils.getRandomId(publicKeys.contacts1)
    let url = `https://${randomId}9999.secrez.cc`

    try {
      await C.contacts.contacts({
        add: 'contacts1',
        publicKey: publicKeys.contacts1,
        url
      })
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'The url is not a valid one')
    }

    url = `https://somerandom.secrez.cc`

    try {
      await C.contacts.contacts({
        add: 'contacts1',
        publicKey: publicKeys.contacts1,
        url
      })
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'The url is not a valid one')
    }

    randomId = hubUtils.getRandomId(publicKeys.contacts2)
    url = `https://${randomId}.secrez.cc`

    try {
      await C.contacts.contacts({
        add: 'contacts1',
        publicKey: publicKeys.contacts1,
        url
      })
      assert.isTrue(false)
    } catch (e) {
      assert.equal(e.message, 'The url is not a valid one')
    }

    await noPrint(C.contacts.exec({
      add: 'contacts1',
      publicKey: publicKeys.contacts1
    }))

    await noPrint(C.contacts.exec({
      add: 'contacts2',
      publicKey: publicKeys.contacts2
    }))

    inspect = stdout.inspect()
    await C.contacts.exec({
      delete: 'karl'
    })
    inspect.restore()
    assertConsole(inspect, 'A contact named "karl" does not exist')

    inspect = stdout.inspect()
    await C.contacts.exec({
      rename: ['karl', 'john']
    })
    inspect.restore()
    assertConsole(inspect, 'A contact named "karl" does not exist')

    inspect = stdout.inspect()
    await C.contacts.exec({
      rename: ['contacts1', 'contacts2']
    })
    inspect.restore()
    assertConsole(inspect, 'A contact named "contacts2" already exists')

    inspect = stdout.inspect()
    await C.contacts.exec({
      add: 'some',
      publicKey: 'fhdh1ZvbspPoxJvYA144qseeDvz8rzmhmYgZxtg0FvgFqEzWN4cbUBgCkn29cE3GwJPvj6vsqno8MGom'
    })
    inspect.restore()
    assertConsole(inspect, 'The public hey is not a valid one')

    inspect = stdout.inspect()
    await C.contacts.exec({
      show: 'john'
    })
    inspect.restore()
    assertConsole(inspect, 'A contact named "john" is not in your trusted circle')

    inspect = stdout.inspect()
    await C.contacts.exec({
      add: 'contacts2',
      publicKey: publicKeys.contacts0
    })
    inspect.restore()
    assertConsole(inspect, 'A contact named "contacts2" already exists')

    inspect = stdout.inspect()
    await C.contacts.exec({
      add: 'contacts3',
      publicKey: publicKeys.contacts2
    })
    inspect.restore()
    assertConsole(inspect, 'The contact "contacts2" is already associated to this public key')


  })

})

