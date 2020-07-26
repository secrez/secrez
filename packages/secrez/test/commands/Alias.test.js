const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const clipboardy = require('clipboardy')
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/PromptMock')
const AliasManager = require('../../src/Managers/AliasManager')
const {assertConsole, noPrint, decolorize} = require('../helpers')
const {sleep} = require('@secrez/utils')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Alias', function () {

  let prompt
  let testDir = path.resolve(__dirname, '../../tmp/test')
  let rootDir = path.resolve(testDir, '.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    AliasManager.getCache().reset()
    await fs.emptyDir(testDir)
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.alias.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[6]))

  })

  it('create initialize correctly the AliasManager', async function () {

    inspect = stdout.inspect()
    await C.alias.exec({
      list: true
    })
    inspect.restore()
    assertConsole(inspect, [])

    assert.equal(AliasManager.getCache().dataPath, path.join(rootDir, 'cache'))

  })

  it('create aliases and lists them', async function () {

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f',
      skipConfirm: true,
      commandLine: 'ls dir'
    })
    inspect.restore()
    assertConsole(inspect, 'The alias has been created')

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'r',
      skipConfirm: true,
      commandLine: 'rm *'
    })
    inspect.restore()
    assertConsole(inspect, 'The alias has been created')

    inspect = stdout.inspect()
    await C.alias.exec({
      list: true
    })
    inspect.restore()
    assertConsole(inspect, [
        'f  ls dir',
        'r  rm *'
    ])

    inspect = stdout.inspect()
    await C.alias.exec({
      list: true,
      filter: 'ls'
    })
    inspect.restore()
    assertConsole(inspect, [
      'f  ls dir'
    ])

  })

  it.skip('should chain two commands', async function () {

    // TODO Needs support for chained alias in PromptMock

    let content = [
        'user: ciccio',
        'totp: sheurytwrefd'
    ].join('\n')
    let p = '/card.yml'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    await noPrint(C.alias.exec({
      name: 'c',
      skipConfirm: true,
      commandLine: 'copy card.yml -f user --wait -d 0.2 && totp card.yml'
    }))

    await prompt.run('c', C.alias.aliasManager)

    await sleep(100)
    assert.equal(await clipboardy.read(), 'ciccio')

    await sleep(200)
    assert.isTrue(/^\d{6}$/.test(await clipboardy.read()))

  })


  it('rename and delete aliases', async function () {

    await C.alias.exec({
      list: true
    })

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f',
      skipConfirm: true,
      commandLine: 'ls dir'
    })
    inspect.restore()
    assertConsole(inspect, 'The alias has been created')

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'r',
      skipConfirm: true,
      commandLine: 'rm *'
    })
    inspect.restore()
    assertConsole(inspect, 'The alias has been created')

    inspect = stdout.inspect()
    await C.alias.exec({
      delete: 'f'
    })
    inspect.restore()
    assertConsole(inspect, 'The alias "f" has been removed')

    inspect = stdout.inspect()
    await C.alias.exec({
      rename: ['r', 'R']
    })
    inspect.restore()
    assertConsole(inspect, 'The alias "r" has been renamed "R"')

  })

  it('should throw if there are errors', async function () {

    await noPrint(C.alias.exec({
      name: 'r',
      skipConfirm: true,
      commandLine: 'rm *'
    }))

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f*',
      skipConfirm: true,
      commandLine: 'ls dir'
    })
    inspect.restore()
    assertConsole(inspect, 'The name "f*" is invalid. Aliases\' names can be any combination of upper and lower letters, numerals, underscores and hiphens')

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f',
      skipConfirm: true,
      commandLine: 'bingo dir'
    })
    inspect.restore()
    assertConsole(inspect, '"bingo" is not a valid command')

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f',
      skipConfirm: true,
      commandLine: 'r'
    })
    inspect.restore()
    assertConsole(inspect, 'Can not make an alias of an alias')


    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'f',
      skipConfirm: true
    })
    inspect.restore()
    assertConsole(inspect, 'Wrong parameters')

    inspect = stdout.inspect()
    await C.alias.exec({
      name: 'r',
      skipConfirm: true,
      commandLine: 'rm *'
    })
    inspect.restore()
    assertConsole(inspect, 'An alias named "r" already exists')

    inspect = stdout.inspect()
    await C.alias.exec({
      delete: 'ds'
    })
    inspect.restore()
    assertConsole(inspect, 'An alias named "ds" does not exist')

    inspect = stdout.inspect()
    await C.alias.exec({
      rename: ['x', 'R']
    })
    inspect.restore()
    assertConsole(inspect, 'An alias named "x" does not exist')

  })

})

