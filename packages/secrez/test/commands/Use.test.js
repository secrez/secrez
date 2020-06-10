const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const chai = require('chai')
const assert = chai.assert
const Prompt = require('../mocks/PromptMock')
const {assertConsole, decolorize, noPrint} = require('../helpers')
const pkg = require('../../package')

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

})

