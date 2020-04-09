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
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()

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

