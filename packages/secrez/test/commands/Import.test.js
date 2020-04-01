const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const Mkdir = require('../../src/commands/Mkdir')
const Touch = require('../../src/commands/Touch')
const Cat = require('../../src/commands/Cat')
const Lpwd = require('../../src/commands/Lpwd')
const Cd = require('../../src/commands/Cd')
const Lcd = require('../../src/commands/Lcd')
const Lcat = require('../../src/commands/Lcat')
const Import = require('../../src/commands/Import')
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

describe('#Import', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let import0
  let mkdir
  let cd
  let cat
  let lcat
  let lpwd
  let lcd
  let inspect

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../fixtures/files')
  }

  beforeEach(async function () {
    await fs.emptyDir(rootDir)
    prompt = new Prompt
    await prompt.init(options)
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
    import0 = new Import(prompt)
    mkdir = new Mkdir(prompt)
    cd = new Cd(prompt)
    lcd = new Lcd(prompt)
    cat = new Cat(prompt)
    lcat = new Lcat(prompt)
    lpwd = new Lpwd(prompt)
  })

  it('should instantiate a Import object', async function () {

    assert.isTrue(Array.isArray(import0.optionDefinitions))
  })

  it('should import a file in the current folder', async function () {

    let content = await lcat.lcat({
      path: 'file3'
    })

    await mkdir.exec({
      path: '/folder'
    })
    await cd.exec({
      path: '/folder'
    })

    inspect = stdout.inspect()
    await import0.exec({
      path: 'file3'
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file3'])

    let newSecret = await cat.cat({path: '/folder/file3'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.TEXT)
    assert.equal(newSecret[0].content, content)

  })

  it('should read a folder and import the only text file', async function () {

    let content1 = await lcat.lcat({
      path: 'folder1/file1'
    })
    let content2 = await lcat.lcat({
      path: 'folder1/file2'
    })

    await mkdir.exec({
      path: '/folder'
    })
    await cd.exec({
      path: '/folder'
    })

    inspect = stdout.inspect()
    await import0.exec({
      path: 'folder1'
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file1', 'file2'])

    let newSecret = await cat.cat({path: '/folder/file1'})
    assert.equal(content1, newSecret[0].content)
    newSecret = await cat.cat({path: '/folder/file2'})
    assert.equal(content2, newSecret[0].content)

  })

  it('should read a folder and import text and binary files', async function () {

    await mkdir.exec({
      path: '/folder'
    })
    await cd.exec({
      path: '/folder'
    })

    inspect = stdout.inspect()
    await import0.exec({
      path: 'folder1',
      binarytoo: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', 'file1', 'file1.tar.gz', 'file2'])

    let newSecret = await cat.cat({path: '/folder/file1.tar.gz'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.BINARY)

  })

  it('should simulate the import of two files', async function () {

    await mkdir.exec({
      path: '/folder'
    })
    await cd.exec({
      path: '/folder'
    })

    inspect = stdout.inspect()
    await import0.exec({
      path: 'folder1',
      simulate: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files (simulation):', 'file1', 'file2'])

    try {
      await cat.cat({path: '/folder/file1'})
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Path does not exist')
    }
    try {
      await cat.cat({path: '/folder/file2'})
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Path does not exist')
    }

  })

  it('should move the imported file', async function () {

    await mkdir.exec({
      path: '/folder'
    })
    await cd.exec({
      path: '/folder'
    })

    // we copy the file to be moved in order to not change the data
    let dest = path.resolve(__dirname, '../../tmp/test/file4')
    await fs.copy(path.join(options.localDir, 'file3'), dest)
    assert.isTrue(await fs.pathExists(dest))

    await lcd.lcd({
      path: '../../../tmp/test'
    })

    let content = await lcat.lcat({
      path: 'file4'
    })

    inspect = stdout.inspect()
    await import0.exec({
      path: 'file4',
      move: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files (moved):', 'file4'])

    let newSecret = await cat.cat({path: '/folder/file4'})
    assert.equal(newSecret[0].type, prompt.secrez.config.types.TEXT)
    assert.equal(newSecret[0].content, content)

    assert.isFalse(await fs.pathExists(dest))

  })

})

