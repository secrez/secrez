const chai = require('chai')
const assert = chai.assert
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

describe('#Bash', function () {

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

  it('should show the content of an external file via bash', async function () {

    await noPrint(C.lcd.exec({path: 'folder1'}))

    // inspect = stdout.inspect()
    let result = await C.bash.bash({command: 'cat file1'})
    assert.equal(result, 'Some secret\n')

    inspect = stdout.inspect()
    await C.bash.exec({command: 'cat file1'})
    inspect.restore()
    assertConsole(inspect, 'Some secret')

  })

})

