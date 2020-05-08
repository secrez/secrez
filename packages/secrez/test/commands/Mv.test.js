const assert = require('chai').assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Mv', function () {

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
    await C.mv.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[5]))

  })

  it('should rename a file', async function () {

    let file1 = await C.touch.touch({
      path: '/folder2/file1',
      type: config.types.TEXT
    })

    await C.mv.mv({
      path: '/folder2/file1',
      newPath: '/folder2/file2'
    })

    assert.equal(file1.getName(), 'file2')

    await C.mv.mv({
      path: '/folder2/file2',
      newPath: '/folder2/file3'
    })

    assert.equal(file1.getName(), 'file3')

  })


  it('should move a file to another folder', async function () {

    let file1 = await C.touch.touch({
      path: '/folder1/file1',
      type: config.types.TEXT
    })

    await C.mkdir.mkdir({
      path: '/folder2',
      type: config.types.DIR
    })

    inspect = stdout.inspect()
    await C.mv.exec({
      path: '/folder1/file1',
      destination: '/folder2/file1'
    })
    inspect.restore()
    assertConsole(inspect, '/folder1/file1 has been moved to /folder2/file1')

    assert.equal(file1.getPath(), '/folder2/file1')

  })


  it('should move many files to another folder', async function () {

    let file1 = await C.touch.touch({
      path: '/folder1/ff1',
      type: config.types.TEXT
    })

    let file2 = await C.touch.touch({
      path: '/folder1/ff2',
      type: config.types.TEXT
    })

    let file3 = await C.touch.touch({
      path: '/folder1/gg',
      type: config.types.TEXT
    })

    await C.mkdir.mkdir({
      path: '/folder2',
      type: config.types.DIR
    })

    inspect = stdout.inspect()
    await C.mv.exec({
      path: '/folder1/ff*',
      destination: '/folder2'
    })
    inspect.restore()
    assertConsole(inspect, '/folder1/ff* has been moved to /folder2')

    assert.equal(file1.getPath(), '/folder2/ff1')
    assert.equal(file2.getPath(), '/folder2/ff2')
    assert.equal(file3.getPath(), '/folder1/gg')

  })

  it('should move a file to another subfolder', async function () {

    let file = await C.touch.touch({
      path: '/f1/f2/f3/f4.txt',
      type: config.types.TEXT
    })

    await C.mkdir.mkdir({
      path: '/f1/f5/f6',
      type: config.types.DIR
    })

    await C.cd.cd({
      path: '/f1/f2'
    })

    inspect = stdout.inspect()
    await C.mv.exec({
      path: 'f3/f4.txt',
      destination: '../f5/f6/f4.txt'
    })
    inspect.restore()
    assertConsole(inspect, 'f3/f4.txt has been moved to ../f5/f6/f4.txt')

    assert.equal(file.getPath(), '/f1/f5/f6/f4.txt')

  })

  it('should move and rename file to another folder', async function () {

    let file1 = await C.touch.touch({
      path: '/folder1/file1',
      type: config.types.TEXT
    })

    await C.mkdir.mkdir({
      path: '/folder2',
      type: config.types.DIR
    })

    await C.mv.mv({
      path: '/folder1/file1',
      newPath: '/folder2/file2'
    })

    assert.equal(file1.getPath(), '/folder2/file2')

  })

  it('should throw if parameters are missed or wrong', async function () {

    inspect = stdout.inspect()
    await C.mv.exec({
      destination: '/bollu'
    })
    inspect.restore()
    assertConsole(inspect, 'An origin path is required.')

    inspect = stdout.inspect()
    await C.mv.exec({
      path: '/bullo',
      destination: '/bollu'
    })
    inspect.restore()
    assertConsole(inspect, 'Path does not exist')


    await C.touch.touch({
      path: '/bit',
      type: config.types.TEXT
    })

    inspect = stdout.inspect()
    await C.mv.exec({
      path: '/b*',
      destination: 'none'
    })
    inspect.restore()
    assertConsole(inspect, 'When using wildcards, the target has to be a folder')

    inspect = stdout.inspect()
    await C.mv.exec({
      path: '/b*',
      destination: 'file'
    })
    inspect.restore()
    assertConsole(inspect, 'When using wildcards, the target has to be a folder')


  })


})

