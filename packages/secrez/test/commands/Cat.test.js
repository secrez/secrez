const stdout = require('test-console').stdout
const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/PromptMock')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations,
  someYaml,
  someModifiedYaml,
  someMoreModifiedYaml
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Cat', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../fixtures/files')
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
    await C.cat.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should show the content of a file', async function () {

    await noPrint(C.touch.exec({path: '/dir1/file1', content: 'Some password'}))

    let node = prompt.internalFs.tree.root.getChildFromPath('/dir1/file1')
    let formattedDate = C.cat.formatTs(node.lastTs)

    inspect = stdout.inspect()
    await C.cat.exec({path: '/dir1/file1', metadata: true})
    inspect.restore()
    assertConsole(inspect, [formattedDate, 'Some password'])

    let dir1 = prompt.internalFs.tree.root.getChildFromPath('/dir1')
    prompt.internalFs.tree.workingNode = dir1

    inspect = stdout.inspect()
    await C.cat.exec({path: 'file1'})
    inspect.restore()
    assertConsole(inspect, ['Some password'])

  })

  it('should show either one or all the versions of a file', async function () {

    let {internalFs} = prompt
    let {config} = prompt.secrez

    let file1 = await noPrint(internalFs.make({
      path: 'folder1/file1',
      type: config.types.TEXT
    }))

    await noPrint(internalFs.change({
      path: '/folder1/file1',
      // newPath: '/folder1/file1',
      content: 'Password 2'
    }))

    assert.equal(file1.getPath(), '/folder1/file1')

    await noPrint(
        internalFs.change({
      path: '/folder1/file1',
      newPath: '/folder1/file2',
      content: 'Password 3'
    }))

    let versions = file1.getVersions()

    inspect = stdout.inspect()
      await C.cat.exec({path: '/folder1/file2', all: true})
    inspect.restore()
    assertConsole(inspect, [
      C.cat.formatTs(versions[0]),
      'Password 3',
      C.cat.formatTs(versions[1]) + ' (file1)',
      'Password 2',
      C.cat.formatTs(versions[2]) + ' (file1)',
      '-- this version is empty --'
    ])
  })

  it('should throw if entry is not a file or file does not exist', async function () {
    await noPrint(C.mkdir.exec({path: '/dir1/dir2'}))

    inspect = stdout.inspect()
    await C.cat.exec({path: '/dir1/dir2'})
    inspect.restore()
    assertConsole(inspect, 'Cat requires a valid file')

    inspect = stdout.inspect()
    await C.cat.exec({path: '/dir1/file1'})
    inspect.restore()
    assertConsole(inspect, 'Path does not exist')

    await noPrint(C.touch.exec({
      path: 'folder1'
    }))

    inspect = stdout.inspect()
    await C.cat.exec({path: '/folder1', version: ['aass']})
    inspect.restore()
    assertConsole(inspect, [])


  })

  it('should throw if trying to cat a binary file', async function () {

    await noPrint(
        C.import.exec({
          path: 'folder1',
          binaryToo: true
        }))

    inspect = stdout.inspect()
    await C.cat.exec({path: '/file1.tar.gz'})
    inspect.restore()
    assertConsole(inspect, ['-- this is a binary file --'])

  })

  it('should show the content of a Yaml file', async function () {

    let {internalFs} = prompt
    let {config} = prompt.secrez

    await noPrint(internalFs.make({
      path: 'file.yml',
      type: config.types.TEXT,
      content: someYaml
    }))

    await noPrint(internalFs.change({
      path: 'file.yml',
      content: someModifiedYaml
    }))

    await noPrint(internalFs.change({
      path: 'file.yml',
      content: someMoreModifiedYaml
    }))

    inspect = stdout.inspect()
    await C.cat.exec({path: 'file.yml', field: 'password'})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.equal(output[0], 'password: 93939393848484')

    inspect = stdout.inspect()
    await C.cat.exec({path: 'file.yml'})
    inspect.restore()
    output = inspect.output.map(e => decolorize(e))
    assert.equal(output[0].split('\n')[2], 'private_key: asdjahejkhkasdhaskjdhsakjdhewkhfwekfhfhasdjas')

    inspect = stdout.inspect()
    await C.cat.exec({path: 'file.yml', all: true, field: 'expose'})
    inspect.restore()
    output = inspect.output.map(e => decolorize(e))

    assert.equal(output[1],  'expose: 6379')
    assert.equal(output[3],  '-- empty field --')
    assert.equal(output[5],  'expose: 6378')

    inspect = stdout.inspect()
    await C.cat.exec({path: 'file.yml', all: true})
    inspect.restore()
    output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/urls/.test(output[1]))
    assert.isFalse(/urls/.test(output[3]))
    assert.isFalse(/urls/.test(output[5]))

  })

})

