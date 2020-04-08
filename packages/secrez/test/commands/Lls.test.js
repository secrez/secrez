const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

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
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should list a folder', async function () {

    inspect = stdout.inspect()
    await C.lls.exec({path: '*'})
    inspect.restore()
    let str = decolorize(inspect.output.join('\n'))
    assert.isTrue(/file3 +folder1/.test(str))

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

