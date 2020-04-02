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

describe('#Cd', function () {

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

  it('change to a folder', async function () {

    await C.mkdir.exec({path: '/dir1/dirA1/dirA2'})
    await C.cd.exec({path: 'dir1/dirA1'})

    assert.equal(prompt.internalFs.tree.workingNode.getPath(), ['/dir1/dirA1'])

  })

  it('return en error if changing to a file', async function () {

    inspect = stdout.inspect()
    await C.touch.exec({
      path: {path: '/dir1/dir2/file2'}
    })
    await C.cd.exec({path: '/dir1/dir2/file2'})
    inspect.restore()
    assertConsole(inspect, 'The "path" option must exist and be of type string')

  })

})

