const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const clipboardy = require('clipboardy')

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, sleep, noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Export', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../../tmp/test')
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should export a file to the current local folder', async function () {

    let content = 'Some secret'
    let p = '/folder/file'

    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file'])

    let content2 = await C.lcat.lcat({path: path.join(await C.lpwd.lpwd(), 'file')})
    assert.equal(content2, content)

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file.2'])

    content2 = await C.lcat.lcat({path: path.join(await C.lpwd.lpwd(), 'file.2')})
    assert.equal(content2, content)

  })

  it('should export a file to the clipboard', async function () {

    let content = 'Some secret'
    let p = '/folder/file'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file',
      clipboard: 1
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', 'file'])

    await sleep(100)
    assert.equal(await clipboardy.read(), content)

    await sleep(1000)
    assert.isFalse(!!await clipboardy.read())

  })

  it('should return an error if the file does not exist or is a folder', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: '/folder'
    })
    inspect.restore()
    assertConsole(inspect, ['Cannot export a folder'])

    inspect = stdout.inspect()
    await C.export.exec({
      path: '/some'
    })
    inspect.restore()
    assertConsole(inspect, ['Path does not exist'])


  })

  it('should throw if copying to clipboard a binary files', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))
    await noPrint(C.lcd.exec({
      path: '../../test/fixtures/files'
    }))
    await noPrint(C.import.exec({
      path: 'folder1/file1.tar.gz',
      binarytoo: true
    }))
    await noPrint(C.lcd.exec({
      path: '../../../tmp/test'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz',
      clipboard: 10
    })
    inspect.restore()
    assertConsole(inspect, ['You can copy to clipboard only text files.'])


  })

})

