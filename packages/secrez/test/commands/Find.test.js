const stdout = require('test-console').stdout
const chai = require('chai')
const assert = chai.assert
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

describe('#Find', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../fixtures/files')
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
    await C.find.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[5]))

  })

  it('should show find a string in the tree', async function () {

    let {internalFs} = prompt
    let {config} = prompt.secrez

    await noPrint(internalFs.make({
      path: 'folder1/file1',
      type: config.types.TEXT
    }))

    await noPrint(internalFs.change({
      path: '/folder1/file1',
      content: 'Password 2'
    }))

    await noPrint(internalFs.change({
      path: '/folder1/file1',
      newPath: '/folder1/File2',
      content: 'Password 3'
    }))

    await noPrint(internalFs.make({
      path: 'folder2/file3',
      type: config.types.TEXT
    }))

    await noPrint(internalFs.make({
      path: 'folder4/some',
      type: config.types.TEXT
    }))

    await noPrint(internalFs.make({
      path: 'folder3/folder4/FOLDER5/File3',
      type: config.types.TEXT
    }))

    inspect = stdout.inspect()
    await C.find.exec({
      name: 'file'
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/\n$/, ''))
    assert.equal(output[0], '3 results found:')
    output[1] = output[1].split('\n')
    assert.equal(output[1][0], '/folder1/File2')
    assert.equal(output[1][1], '/folder2/file3')
    assert.equal(output[1][2], '/folder3/folder4/FOLDER5/File3')

    inspect = stdout.inspect()
    await C.find.exec({
      name: 'der'
    })
    inspect.restore()
    output = inspect.output.map(e => decolorize(e).replace(/\n$/, ''))
    assert.equal(output[0], '6 results found:')
    output[1] = output[1].split('\n')
    assert.equal(output[1][0], '/folder1')
    assert.equal(output[1][5], '/folder3/folder4/FOLDER5')

    inspect = stdout.inspect()
    await C.find.exec({
      name: '3'
    })
    inspect.restore()
    output = inspect.output.map(e => decolorize(e).replace(/\n$/, ''))
    assert.equal(output[0], '3 results found:')
    output[1] = output[1].split('\n')
    assert.equal(output[1][0], '/folder2/file3')
    assert.equal(output[1][1], '/folder3')
    assert.equal(output[1][2], '/folder3/folder4/FOLDER5/File3')

    inspect = stdout.inspect()
    await C.find.exec({
      name: 'file1',
      all: true
    })
    inspect.restore()
    assertConsole(inspect, ['1 result found:',
      'file1'
    ], true)

    inspect = stdout.inspect()
    await C.find.exec({
      name: 'Password',
      content: true
    })
    inspect.restore()
    assertConsole(inspect, ['1 result found:',
      '/folder1/File2'
    ])
  })

  it('should find no result without parameters', async function () {

    inspect = stdout.inspect()
    await C.find.exec({})
    inspect.restore()
    assertConsole(inspect, ['Missing parameters'])

  })

  it('should skip binary files from search', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    await noPrint(C.import.exec({
      path: 'folder1',
      'binary-too': true
    }))

    inspect = stdout.inspect()
    await C.find.exec({
      name: 'm',
      content: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e).replace(/\n$/, ''))
    assert.equal(output[0], '2 results found:')
    output[1] = output[1].split('\n')
    assert.equal(output[1][0], '/folder/file$2')
    assert.equal(output[1][1], '/folder/file1')

  })


})

