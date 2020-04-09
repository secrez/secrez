const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

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
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
    await noPrint(C.lcd.exec({path: 'folder1'}))
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

