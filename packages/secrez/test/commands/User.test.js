const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const UserManager = require('../../src/UserManager')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#User', function () {

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
      prompt = new Prompt
      await prompt.init(options)
      await prompt.secrez.signup(password, iterations)
      publicKeys['user' + i] = prompt.secrez.getPublicKey()
    }
  })

  beforeEach(async function () {
    UserManager.getCache().reset()
    await fs.emptyDir(testDir)
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.user.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('initialize correctly the UserManager', async function () {

    inspect = stdout.inspect()
    await C.user.exec({
      list: true
    })
    inspect.restore()
    assertConsole(inspect, [])

    assert.equal(UserManager.getCache().dataPath, path.join(rootDir, 'cache'))

  })

  it('returns my public key', async function () {

    inspect = stdout.inspect()
    await C.user.exec({
      myPublicKey: true
    })
    inspect.restore()
    assertConsole(inspect, [
      'Your public key:',
      prompt.secrez.getPublicKey()
    ])
  })

  it('create a users', async function () {

    inspect = stdout.inspect()
    await C.user.exec({
      add: ['user1', publicKeys.user1]
    })
    inspect.restore()
    assertConsole(inspect, `The user "user1" with the public key "${publicKeys.user1}" has been added to your trusted users`)

  })

  it('create users and get their public keys', async function () {

    await noPrint(C.user.exec({
      add: ['user1', publicKeys.user1]
    }))

    inspect = stdout.inspect()
    await C.user.exec({
      add: ['user2', publicKeys.user2]
    })
    inspect.restore()
    assertConsole(inspect, `The user "user2" with the public key "${publicKeys.user2}" has been added to your trusted users`)

    inspect = stdout.inspect()
    await C.user.exec({
      publicKeyOf: 'user1'
    })
    inspect.restore()
    assertConsole(inspect, [
      'user1\'s public key:',
      publicKeys.user1
    ])

  })

  it('should list users', async function () {

    await noPrint(C.user.exec({
      add: ['user1', publicKeys.user1]
    }))

    await noPrint(C.user.exec({
      add: ['user2', publicKeys.user2]
    }))

    inspect = stdout.inspect()
    await C.user.exec({
      list: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/ +/g, ' '))
    assert.equal(output[0], 'User Public Key')
    assert.equal(output[1], 'user1 '+ publicKeys.user1)
    assert.equal(output[2], 'user2 '+ publicKeys.user2)

  })

  it('should rename a user', async function () {

    await noPrint(C.user.exec({
      add: ['user1', publicKeys.user1]
    }))

    inspect = stdout.inspect()
    await C.user.exec({
      rename: ['user1', 'userA']
    })
    inspect.restore()
    assertConsole(inspect, 'The user "user1" has been renamed "userA"')

  })

  it('should remove a user', async function () {

    await noPrint(C.user.exec({
      add: ['user1', publicKeys.user1]
    }))

    await noPrint(C.user.exec({
      add: ['user2', publicKeys.user2]
    }))

    inspect = stdout.inspect()
    await C.user.exec({
      remove: 'user1'
    })
    inspect.restore()
    assertConsole(inspect, 'The user "user1" has been removed')

    inspect = stdout.inspect()
    await C.user.exec({
      list: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/ +/g, ' '))
    assert.equal(output.length, 2)

  })


  it('should throw if there are errors', async function () {

    await noPrint(C.user.exec({
      add: ['user1', publicKeys.user1]
    }))

    await noPrint(C.user.exec({
      add: ['user2', publicKeys.user2]
    }))

    inspect = stdout.inspect()
    await C.user.exec({
      remove: 'karl'
    })
    inspect.restore()
    assertConsole(inspect, 'A user named "karl" does not exist')

    inspect = stdout.inspect()
    await C.user.exec({
      rename: ['karl', 'john']
    })
    inspect.restore()
    assertConsole(inspect, 'A user named "karl" does not exist')

    inspect = stdout.inspect()
    await C.user.exec({
      rename: ['user1', 'user2']
    })
    inspect.restore()
    assertConsole(inspect, 'A user named "user2" already exists')

    inspect = stdout.inspect()
    await C.user.exec({
      add: ['user2', 'fhdh1ZvbspPoxJvYA144qseeDvz8rzmhmYgZxtg0FvgFqEzWN4cbUBgCkn29cE3GwJPvj6vsqno8MGom']
    })
    inspect.restore()
    assertConsole(inspect, 'The public hey is not a valid one')

    inspect = stdout.inspect()
    await C.user.exec({
      publicKeyOf: 'john'
    })
    inspect.restore()
    assertConsole(inspect, 'User "john" is not in your trusted circle')

    inspect = stdout.inspect()
    await C.user.exec({
      add: ['user2', publicKeys.user0]
    })
    inspect.restore()
    assertConsole(inspect, 'A user named "user2" already exists')

    inspect = stdout.inspect()
    await C.user.exec({
      add: ['user3', publicKeys.user2]
    })
    inspect.restore()
    assertConsole(inspect, 'The user "user2" is already associated to this public key')


  })

})

