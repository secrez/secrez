const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/PromptMock')
const {assertConsole, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Help', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C


  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../fixtures/files')
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.help.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/Available command/.test(output[1]))

  })

  it('#execAsync and format', async function () {

    inspect = stdout.inspect()
    await C.help.exec({command: 'pwd' })
    inspect.restore()
    let str = decolorize(inspect.output.join('\n'))
    assert.isTrue(/Examples:[^p]+pwd/.test(str))

    inspect = stdout.inspect()
    await C.help.exec({command: 'cat' })
    inspect.restore()
    str = decolorize(inspect.output.join('\n'))
    assert.isTrue(/Available options/.test(str))


  })

  it('should throw if wrong command', async function () {

    inspect = stdout.inspect()
    await C.help.exec({command: 'wrong' })
    inspect.restore()
    assertConsole(inspect, 'Invalid command.')

  })


  it('-- to complete coverage', async function () {

    for (let cmd in C) {
      await C[cmd].help()
    }

  })



})

