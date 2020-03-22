const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Touch = require('../../src/commands/Touch')
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

describe('#Mkdir', function () {

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

  it('should instantiate a Mkdir object', async function () {

    let mkdir = new Mkdir(prompt)
    assert.isTrue(Array.isArray(mkdir.optionDefinitions))
  })


  it('should create a folder', async function () {

    let mkdir = new Mkdir(prompt)
    await mkdir.exec({
      path: '/folder'
    })

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder').getName(), 'folder')
  })

  it('should create a nested folder', async function () {

    let mkdir = new Mkdir(prompt)
    await mkdir.exec({
      path: '/folder1/folder2'
    })

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder1/folder2').getName(), 'folder2')

  })

  it('should throw if trying to create a child of a file', async function () {

    let mkdir = new Mkdir(prompt)
    let touch = new Touch(prompt)
    await touch.exec({
      path: '/folder/file1'
    })

    inspect = stdout.inspect()
    await mkdir.exec({
      path: '/folder/file1/file2'
    })
    inspect.restore()
    assertConsole(inspect, 'This entry does not represent a folder')

  })

  it('should throw if wrong parameters', async function () {

    let mkdir = new Mkdir(prompt)

    inspect = stdout.inspect()
    await mkdir.exec({})
    inspect.restore()
    assertConsole(inspect, 'Directory path not specified.')

    inspect = stdout.inspect()
    await mkdir.exec({
      path: {}
    })
    inspect.restore()
    assertConsole(inspect, 'The "path" option must exist and be of type string')

    await mkdir.exec({
      path: '/folder'
    })
    inspect = stdout.inspect()
    await mkdir.exec({
      path: '/folder'
    })
    inspect.restore()
    assertConsole(inspect, 'Ancestor not found')

  })

})

