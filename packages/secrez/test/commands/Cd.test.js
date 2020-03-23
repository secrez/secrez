const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Touch = require('../../src/commands/Touch')
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

describe('#Cd', function () {

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

  it('should instantiate a Cd object', async function () {

    let cd = new Cd(prompt)
    assert.isTrue(Array.isArray(cd.optionDefinitions))
  })


  it('move to a folder', async function () {

    let mkdir = new Mkdir(prompt)
    let cd = new Cd(prompt)
    await mkdir.exec({path: '/dir1/dirA1/dirA2'})
    await cd.exec({path: 'dir1/dirA1'})

    assert.equal(prompt.internalFs.tree.workingNode.getPath(), ['/dir1/dirA1'])

  })

  it('return en error if moving to a file', async function () {

    let touch = new Touch(prompt)
    let cd = new Cd(prompt)

    inspect = stdout.inspect()
    await touch.exec({
      path: {path: '/dir1/dir2/file2'}
    })
    await cd.exec({path: '/dir1/dir2/file2' })
    inspect.restore()
    assertConsole(inspect, 'The "path" option must exist and be of type string')

  })

})

