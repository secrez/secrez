const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const chai = require('chai')
const assert = chai.assert
const Prompt = require('../mocks/PromptMock')
const {decolorize, noPrint, assertConsole} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Use', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let internalFs
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
    internalFs = prompt.internalFs
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.touch.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[6]))

  })
  it('should use a new dataset, creating it if does not exist', async function () {

    assert.equal(internalFs.treeIndex, 0)

    await noPrint(C.use.exec({
      dataset: 'archive',
      create: true
    }))
    assert.equal(internalFs.treeIndex, 2)
    assert.equal(internalFs.tree.name, 'archive')

    await noPrint(C.use.exec({
      dataset: 'main',
      create: true
    }))
    assert.equal(internalFs.treeIndex, 0)
    assert.equal(internalFs.tree.name, 'main')

  })

  it('should rename a dataset', async function () {

    await noPrint(C.use.exec({
      dataset: 'archive',
      create: true
    }))

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'archive'
    })
    inspect.restore()
    assertConsole(inspect, ['You are already using archive'])

    await noPrint(C.use.exec({
      dataset: 'restore',
      create: true
    }))

    await noPrint(C.use.exec({
      dataset: 'archive',
      rename: 'backup'
    }))
    assert.equal(internalFs.trees[2].name, 'backup')

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'trash',
      rename: 'bin'
    })
    inspect.restore()
    assertConsole(inspect, ['main and trash cannot be renamed'])

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'main',
      rename: 'primary'
    })
    inspect.restore()
    assertConsole(inspect, ['main and trash cannot be renamed'])

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'backup',
      rename: 'restore'
    })
    inspect.restore()
    assertConsole(inspect, ['A dataset named restore already exists'])

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'biondo',
      rename: 'bruno'
    })
    inspect.restore()
    assertConsole(inspect, ['The dataset does not exist; add "-c" to create it'])

    inspect = stdout.inspect()
    await C.use.exec({
      dataset: 'valerio'
    })
    inspect.restore()
    assertConsole(inspect, ['The dataset does not exist; add "-c" to create it'])

    inspect = stdout.inspect()
    await C.use.exec({
      wrong: 'valerio'
    })
    inspect.restore()
    assertConsole(inspect, ['Wrong parameters'])

  })

  it('#completion should return the list of the datasets', async function () {

    let completion = C.use.completion()
    let result = (await completion({})).sort()
    assert.equal(result.join(' '), 'main trash')
    result = (await completion({
      dataset: 'ma'
    })).sort()
    assert.equal(result.join(' '), 'main')

  })

})

