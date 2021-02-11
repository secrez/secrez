const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const clipboardy = require('clipboardy')
const fs = require('fs-extra')
const path = require('path')

const {yamlParse} = require('@secrez/utils')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, sleep, noPrint, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Copy', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../../tmp/test')
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
    await C.copy.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should copy a file to the clipboard', async function () {

    let content = 'Some secret'
    let p = '/folder/file'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    let previousContent = await clipboardy.read()

    inspect = stdout.inspect()
    await C.copy.exec({
      path: 'file',
      duration: [0.2],
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', 'file'])

    await sleep(100)
    assert.equal(await clipboardy.read(), content)

    await sleep(200)
    assert.equal(await clipboardy.read(), previousContent)

  })

  it('should copy a string to the clipboard', async function () {

    inspect = stdout.inspect()
    await C.copy.exec({
      thisString: 'caruso',
      duration: [0.2],
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', '"caruso"'])

    await sleep(100)
    assert.equal(await clipboardy.read(), 'caruso')

    await sleep(100)
  })

  it('should copy a card to the clipboard', async function () {

    let content = [
      'password: s7s7s7s7s',
      'pin: 3625',
      'nickname: geoge'
    ].join('\n')

    let p = 'card.yml'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    inspect = stdout.inspect()
    await C.copy.exec({
      path: p,
      duration: [1],
      json: true,
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', 'card.yml'])

    await sleep(100)
    assert.equal(await clipboardy.read(), JSON.stringify(yamlParse(content), null, 2))

    await sleep(200)

    inspect = stdout.inspect()
    await C.copy.exec({
      path: p,
      duration: [0.2],
      field: ['password'],
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', 'card.yml'])

    await sleep(100)
    assert.equal(await clipboardy.read(), 's7s7s7s7s')

    inspect = stdout.inspect()
    await C.copy.exec({
      path: p,
      duration: [0.2],
      noBeep: true,
      field: ['pin', 'password']
    })
    inspect.restore()
    assertConsole(inspect, ['Copied to clipboard:', 'card.yml'])

    await sleep(100)
    assert.equal(await clipboardy.read(), '3625')

    await sleep(200)
    assert.equal(await clipboardy.read(), 's7s7s7s7s')


    inspect = stdout.inspect()
    await C.copy.exec({
      path: p,
      durationInMillis: [10],
      field: ['none'],
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Field "none" not found in "card.yml"'])

    await noPrint(prompt.internalFs.change({
      path: p,
      content: content += '\ncasas:\nasakdjakddkadkasd'
    }))

    inspect = stdout.inspect()
    await C.copy.exec({
      path: p,
      duration: [1],
      field: ['password'],
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['The yml is malformed. To copy the entire content, do not use the options -j or -f'])


  })


  it('should return an error if the file does not exist or is a folder', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))

    inspect = stdout.inspect()
    await C.copy.exec({
      path: '/folder',
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['Cannot copy a folder'])

    inspect = stdout.inspect()
    await C.copy.exec({
      path: '/some',
      noBeep: true
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
      binaryToo: true
    }))
    await noPrint(C.lcd.exec({
      path: '../../../tmp/test'
    }))

    inspect = stdout.inspect()
    await C.copy.exec({
      path: 'file1.tar.gz',
      noBeep: true
    })
    inspect.restore()
    assertConsole(inspect, ['You can copy to clipboard only text files.'])


  })

})

