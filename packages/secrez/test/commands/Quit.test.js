const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Quit', function () {

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

  it('should show the content of an external file via bash', async function () {

    inspect = stdout.inspect()
    await C.quit.exec({testing: true})
    inspect.restore()
    assertConsole(inspect, 'Bye bye :o)')

  })

})

