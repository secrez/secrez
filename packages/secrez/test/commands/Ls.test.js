const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Ls = require('../../src/commands/Ls')
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

describe.only('#Ls', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

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

  it('should instantiate a Ls object', async function () {

    let ls = new Ls(prompt)
    assert.isTrue(Array.isArray(ls.optionDefinitions))
  })


  it('should list folders and files', async function () {

    let mkdir = new Mkdir(prompt)
    let ls = new Ls(prompt)
    await mkdir.exec({path: '/dir1/dir2'})
    await mkdir.exec({path: '/dir1/dir3'})
    await mkdir.exec({path: '/dir1/dir4'})
    await mkdir.exec({path: '/dir1/dir5'})
    await mkdir.exec({path: '/dir1/dir2/dir6'})
    await mkdir.exec({path: '/dir1/dir2/dir7'})

    let inspect = stdout.inspect()
    await ls.exec({path: '/dir1', list: true})
    inspect.restore()
    assertConsole(inspect, [ 'dir2', 'dir3', 'dir4', 'dir5'])

    inspect = stdout.inspect()
    await ls.exec({path: '/dir1/dir2', list: true})
    inspect.restore()
    assertConsole(inspect, [ 'dir6', 'dir7'])

    inspect = stdout.inspect()
    await ls.exec({path: '/dir1/dir2/dir6', list: true})
    inspect.restore()
    assert.isTrue(inspect.output.length === 0)

  })

})

