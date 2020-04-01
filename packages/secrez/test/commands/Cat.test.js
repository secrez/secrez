const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Touch = require('../../src/commands/Touch')
const Cat = require('../../src/commands/Cat')
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

describe('#Cat', function () {

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

  it('should instantiate a Cat object', async function () {

    let cat = new Cat(prompt)
    assert.isTrue(Array.isArray(cat.optionDefinitions))
  })

  it('should show the content of a file', async function () {

    let touch = new Touch(prompt)
    let cat = new Cat(prompt)

    await touch.exec({path: '/dir1/file1', content: 'Some password'})
    let node = prompt.internalFs.tree.root.getChildFromPath('/dir1/file1')
    let formattedDate = Cat.formatTs(node.lastTs)

    inspect = stdout.inspect()
    await cat.exec({path: '/dir1/file1', metadata: true})
    inspect.restore()
    assertConsole(inspect, [formattedDate, 'Some password'])

    let dir1 = prompt.internalFs.tree.root.getChildFromPath('/dir1')
    prompt.internalFs.tree.workingNode = dir1

    inspect = stdout.inspect()
    await cat.exec({path: 'file1'})
    inspect.restore()
    assertConsole(inspect, ['Some password'])
  })


  it('should show either one or all the versions of a file', async function () {

    let cat = new Cat(prompt)
    let {internalFs} = prompt
    let {config} = prompt.secrez

    let file1 = await internalFs.make({
      path: 'folder1/file1',
      type: config.types.TEXT,
      content: 'Password 1'
    })

    await internalFs.change({
      path: '/folder1/file1',
      content: 'Password 2'
    })

    await internalFs.change({
      path: '/folder1/file1',
      content: 'Password 3'
    })

    let versions = file1.getVersions()

    inspect = stdout.inspect()
    await cat.exec({path: '/folder1/file1', all: true})
    inspect.restore()
    assertConsole(inspect, [
      Cat.formatTs(versions[0]),
      'Password 3',
      Cat.formatTs(versions[1]),
      'Password 2',
      Cat.formatTs(versions[2]),
      'Password 1'
    ])
  })

  it('should throw if entry is not a file or file does not exist', async function () {

    let mkdir = new Mkdir(prompt)
    let cat = new Cat(prompt)

    await mkdir.exec({path: '/dir1/dir2'})

    inspect = stdout.inspect()
    await cat.exec({path: '/dir1/dir2'})
    inspect.restore()
    assertConsole(inspect, 'Cat requires a valid file')

    inspect = stdout.inspect()
    await cat.exec({path: '/dir1/file1'})
    inspect.restore()
    assertConsole(inspect, 'Path does not exist')

  })

})

