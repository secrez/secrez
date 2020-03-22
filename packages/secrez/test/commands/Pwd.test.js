const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Pwd = require('../../src/commands/Pwd')
const Cd = require('../../src/commands/Cd')
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

describe('#Pwd', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let inspect

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(rootDir)
    prompt = new Prompt
    await prompt.init(options)
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should instantiate a Pwd object', async function () {

    let pwd = new Pwd(prompt)
    assert.isTrue(Array.isArray(pwd.optionDefinitions))
  })


  it('should show the working folder', async function () {

    let mkdir = new Mkdir(prompt)
    let cd = new Cd(prompt)
    let pwd = new Pwd(prompt)

    await mkdir.exec({path: '/dir1/dirA1/dirA2'})

    inspect = stdout.inspect()
    await pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/'])

    inspect = stdout.inspect()
    await cd.exec({path: 'dir1/dirA1'})
    await pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/dir1/dirA1'])

    inspect = stdout.inspect()
    await cd.exec()
    await pwd.exec()
    inspect.restore()
    assertConsole(inspect, ['/'])

  })

})

