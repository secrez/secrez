const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/PromptMock')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Touch', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()

  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.touch.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[6]))

  })

  it('should create a file', async function () {

    await noPrint(C.touch.exec({
      path: '/folder2/file1'
    }))

    assert.equal(prompt.internalFs.tree.root.getChildFromPath('/folder2/file1').type, prompt.secrez.config.types.TEXT)


    inspect = stdout.inspect()
    await C.touch.exec({
      path: '/folder2/file1'
    })
    inspect.restore()
    assertConsole(inspect, ['An entry with the name "file1" already exists'])

    await noPrint(C.touch.exec({
      path: '/folder2/file1',
      versionIfExists: true
    }))

    let names = []
    let children = prompt.internalFs.tree.root.getChildFromPath('/folder2').children
    for (let id in children) {
      names.push(children[id].getPath())
    }

    assert.equal(names[0], '/folder2/file1')
    assert.equal(names[1], '/folder2/file1.2')

  })


  it('should create a file with content', async function () {

    let p = '/folder2/file1'
    let content = 'Password: eh3h447d743yh4r'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    assert.equal(prompt.internalFs.tree.root.getChildFromPath(p).getContent(), content)

  })

  it('should throw if trying to create a child of a file', async function () {

    await noPrint(C.touch.exec({
      path: '/folder/file1'
    }))

    inspect = stdout.inspect()
    await C.touch.exec({
      path: '/folder/file1/file2'
    })
    inspect.restore()
    assertConsole(inspect, 'The entry does not represent a folder')

  })

  it('should throw if wrong parameters', async function () {


    inspect = stdout.inspect()
    await C.touch.exec({})
    inspect.restore()
    assertConsole(inspect, 'A valid path is required')

    inspect = stdout.inspect()
    await C.touch.exec({
      path: {}
    })
    inspect.restore()
    assertConsole(inspect, 'A valid path is required')

    await noPrint(C.touch.exec({
      path: '/file'
    }))

    inspect = stdout.inspect()
    await C.touch.exec({
      path: '/file'
    })
    inspect.restore()
    assertConsole(inspect, 'An entry with the name "file" already exists')

    inspect = stdout.inspect()
    await C.touch.exec({
      path: '/fil|<e'
    })
    inspect.restore()
    assertConsole(inspect, 'A filename cannot contain \\/><|:&?*^$ chars.')

  })

})

