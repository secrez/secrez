const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Lls', function () {

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
    await C.lls.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[5]))

  })

  it('should list a folder', async function () {

    inspect = stdout.inspect()
    await C.lls.exec({path: '*'})
    inspect.restore()
    let str = decolorize(inspect.output.join('\n'))
    assert.isTrue(/file0\.txt/.test(str))
    assert.isTrue(/file3/.test(str))
    assert.isTrue(/folder1/.test(str))
  })

  it('return en error if lls-ing a not existing path', async function () {

    inspect = stdout.inspect()
    await C.lls.exec({path: 'none' })
    inspect.restore()
    assertConsole(inspect, '-- no files found --')

  })

  it('return a message if no files are found', async function () {

    inspect = stdout.inspect()
    await C.lls.exec({path: './folder1/folder2' })
    inspect.restore()
    assertConsole(inspect, '-- no files found --')

  })

})

