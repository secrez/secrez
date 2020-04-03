const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Import', function () {

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

  it('should import a file in the current folder', async function () {

    let content = await C.lcat.lcat({
      path: 'file3'
    })

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'file3'
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file3'])

    let newSecret = await C.cat.cat({path: '/folder/file3'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.TEXT)
    assert.equal(newSecret[0].content, content)


    inspect = stdout.inspect()
    await C.import.exec({
      path: 'file3'
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file3.2'])

    newSecret = await C.cat.cat({path: '/folder/file3.2'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.TEXT)
    assert.equal(newSecret[0].content, content)

  })

  it('should read a folder and import the only text file', async function () {

    let content1 = await C.lcat.lcat({
      path: 'folder1/file1'
    })
    let content2 = await C.lcat.lcat({
      path: 'folder1/file2'
    })

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'folder1'
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file1', 'file2'])

    let newSecret = await C.cat.cat({path: '/folder/file1'})
    assert.equal(content1, newSecret[0].content)
    newSecret = await C.cat.cat({path: '/folder/file2'})
    assert.equal(content2, newSecret[0].content)

  })

  it('should read a folder and import text and binary files', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'folder1',
      binarytoo: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file1', 'file1.tar.gz', 'file2'])

    let newSecret = await C.cat.cat({path: '/folder/file1.tar.gz'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.BINARY)

  })

  it('should simulate the import of two files', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'folder1',
      simulate: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files (simulation):', 'file1', 'file2'])

    try {
      await C.cat.cat({path: '/folder/file1'})
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Path does not exist')
    }
    try {
      await C.cat.cat({path: '/folder/file2'})
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Path does not exist')
    }

  })

  it('should move the imported file', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    // we copy the file to be moved in order to not change the data
    let dest = path.resolve(__dirname, '../../tmp/test/file4')
    await fs.copy(path.join(options.localDir, 'file3'), dest)
    assert.isTrue(await fs.pathExists(dest))

    await C.lcd.lcd({
      path: '../../../tmp/test'
    })

    let content = await C.lcat.lcat({
      path: 'file4'
    })

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'file4',
      move: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files (moved):', 'file4'])

    let newSecret = await C.cat.cat({path: '/folder/file4'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.TEXT)
    assert.equal(newSecret[0].content, content)

    assert.isFalse(await fs.pathExists(dest))

  })

})

