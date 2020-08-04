const assert = require('chai').assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Pwd', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: __dirname
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
    await C.pwd.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should show the working folder', async function () {

    await noPrint(C.mkdir.exec({path: '/dir1/dirA1/dirA2'}))

    inspect = stdout.inspect()
    await C.pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/'])

    await noPrint(C.cd.exec({path: 'dir1/dirA1'}))

    inspect = stdout.inspect()
    await C.pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/dir1/dirA1'])

    await noPrint(C.cd.exec())

    inspect = stdout.inspect()
    await C.pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/'])

  })

})

