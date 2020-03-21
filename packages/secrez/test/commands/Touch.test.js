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

describe('#Touch', function () {

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

  it('should instantiate a Touch object', async function () {

    let touch = new Touch(prompt)
    assert.isTrue(Array.isArray(touch.optionDefinitions))
  })


  it('should create a file', async function () {

    let touch = new Touch(prompt)
    await touch.exec({
      path: '/folder2/file1'
    })

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder2/file1').type, prompt.secrez.config.types.FILE)

  })


  it('should create a file with content', async function () {

    let touch = new Touch(prompt)
    let p = '/folder2/file1'
    let content = 'Password: eh3h447d743yh4r'
    await touch.exec({
      path: p,
      content
    })

    assert.equal(prompt.internalFs.tree.root.getChildFromPath(p).getContent(), content)

  })

  it('should throw if trying to create a child of a file', async function () {

    let touch = new Touch(prompt)
    await touch.exec({
      path: '/folder/file1'
    })

    let inspect = stdout.inspect()
    await touch.exec({
      path: '/folder/file1/file2'
    })
    inspect.restore()
    assertConsole(inspect, 'This entry does not represent a folder')

  })

  it('should throw if wrong parameters', async function () {

    let touch = new Touch(prompt)

    let inspect = stdout.inspect()
    await touch.exec({})
    inspect.restore()
    assertConsole(inspect, 'File path not specified.')

    inspect = stdout.inspect()
    await touch.exec({
      path: {}
    })
    inspect.restore()
    assertConsole(inspect, 'The "path" option must exist and be of type string')

    await touch.exec({
      path: '/file'
    })
    inspect = stdout.inspect()
    await touch.exec({
      path: '/file'
    })
    inspect.restore()
    assertConsole(inspect, 'Ancestor not found')

  })

})

