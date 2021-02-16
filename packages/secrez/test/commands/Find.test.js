const stdout = require('test-console').stdout
const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../../src/prompts/MainPromptMock')
const {assertConsole, noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

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
    prompt = new MainPrompt
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
      keywords: 'file'
    })
    inspect.restore()
    assertConsole(inspect, [
      '3 results found:',
      '1  /folder1/File2',
      '2  /folder2/file3',
      '3  /folder3/folder4/FOLDER5/File3'
    ])

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'der'
    })
    inspect.restore()
    assertConsole(inspect, [
      '6 results found:',
      '1  /folder1/',
      '2  /folder2/',
      '3  /folder3/',
      '4  /folder3/folder4/',
      '5  /folder3/folder4/FOLDER5/',
      '6  /folder4/'
    ])

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: '3'
    })
    inspect.restore()
    assertConsole(inspect, ['3 results found:',
      '1  /folder2/file3',
      '2  /folder3/',
      '3  /folder3/folder4/FOLDER5/File3'
    ])

    let nodes = await C.find.find({
      keywords: '3',
      getNodes: true
    })

    assert.equal(nodes.length, 3)

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'file1',
      all: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))[1].split(/ +/)
    assert.equal(output[0], 1)
    assert.equal(output[1].length, 4)
    assert.equal(output[2], '/folder1/File2')
    assert.equal(output[3], 'file1')

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'Password',
      content: true
    })
    inspect.restore()
    assertConsole(inspect, ['1 result found:',
      '1  /folder1/File2'
    ])


    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'main:Password',
      content: true
    })
    inspect.restore()
    assertConsole(inspect, ['1 result found:',
      '1  main:/folder1/File2'
    ])

    await noPrint(C.use.exec({
      dataset: 'archive',
      create: true
    }))

    await noPrint(C.touch.exec({
      path: 'archive:/password',
      content: 's6s633g3ret'
    }))

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'word',
      content: true,
      global: true
    })
    inspect.restore()
    assertConsole(inspect, [
      '2 results found:',
      '1  main:/folder1/File2',
      '2  archive:/password'
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
      binaryToo: true
    }))

    inspect = stdout.inspect()
    await C.find.exec({
      keywords: 'm',
      content: true
    })
    inspect.restore()
    assertConsole(inspect, ['2 results found:',
      '1  /folder/file-2',
      '2  /folder/file1'
    ])

  })


})

