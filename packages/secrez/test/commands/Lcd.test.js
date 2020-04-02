const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Lcd', function () {

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

  it('change to a folder', async function () {


    inspect = stdout.inspect()
    await C.lcd.exec({path: 'folder1'})
    inspect.restore()
    assertConsole(inspect, [])

    assert.equal(await C.lpwd.lpwd(), path.join(options.localDir, 'folder1'))

  })

  it('return en error if changing to a file', async function () {

    inspect = stdout.inspect()
    await C.lcd.exec({path: 'file1' })
    inspect.restore()
    assertConsole(inspect, 'No such directory')

  })

})
