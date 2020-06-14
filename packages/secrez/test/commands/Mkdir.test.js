const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Mkdir', function () {

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

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.mkdir.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should create a folder', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder').getName(), 'folder')
  })

  it('should create a nested folder', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder1/folder2'
    }))

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder1/folder2').getName(), 'folder2')

  })

  it('should throw if trying to create a child of a file', async function () {

    await noPrint(C.touch.exec({
      path: '/folder/file1'
    }))

    inspect = stdout.inspect()
    await C.mkdir.exec({
      path: '/folder/file1/file2'
    })
    inspect.restore()
    assertConsole(inspect, 'The entry does not represent a folder')

  })

  it('should throw if wrong parameters', async function () {

    inspect = stdout.inspect()
    await C.mkdir.exec({})
    inspect.restore()
    assertConsole(inspect, 'Directory path not specified.')

    inspect = stdout.inspect()
    await C.mkdir.exec({
      path: {}
    })
    inspect.restore()
    assertConsole(inspect, 'Path must be a string')

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.mkdir.exec({
      path: '/folder'
    })
    inspect.restore()
    assertConsole(inspect, 'An entry with the name "folder" already exists')

    inspect = stdout.inspect()
    await C.mkdir.exec({
      path: '/fol*?der'
    })
    inspect.restore()
    assertConsole(inspect, 'A filename cannot contain \\/><|:&?*^$ chars.')


  })

})

