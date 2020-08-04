const stdout = require('test-console').stdout
const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Lcat', function () {

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
    await noPrint(C.lcd.exec({path: 'folder1'}))
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.lcat.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('cat a file', async function () {

    inspect = stdout.inspect()
    await C.lcat.exec({path: 'file1'})
    inspect.restore()
    assertConsole(inspect, 'Some secret')

  })

  it('return en error if trying to cat a binary file', async function () {

    inspect = stdout.inspect()
    await C.lcat.exec({path: 'file1.tar.gz' })
    inspect.restore()
    assertConsole(inspect, 'The file looks as a binary file')

  })

})

