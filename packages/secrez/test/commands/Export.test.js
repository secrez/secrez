const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')

const MainPrompt = require('../../src/prompts/MainPromptMock')
const {assertConsole, noPrint, decolorize, sleep} = require('@secrez/test-helpers')
const {execAsync} = require('@secrez/utils')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Export', function () {

  let prompt
  let testDir = path.resolve(__dirname, '../../tmp/test')
  let rootDir = path.resolve(testDir, '.secrez')
  let inspect, C
  let publicKeys = {}

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../../tmp/test')
  }

  before(async function () {
    for (let i = 0; i < 3; i++) {
      await fs.emptyDir(testDir)
      prompt = new MainPrompt
      await prompt.init(options)
      await prompt.secrez.signup(password, iterations)
      publicKeys['user' + i] = prompt.secrez.getPublicKey()
    }
  })

  beforeEach(async function () {
    await fs.emptyDir(testDir)
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.export.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[5]))

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

  // it('should export a file encrypted only for the user itself', async function () {
  //
  //   let content = 'Some secret'
  //   let p = '/file'
  //
  //   await noPrint(C.touch.exec({
  //     path: p,
  //     content
  //   }))
  //
  //   await noPrint(C.lcd.exec({
  //     path: testDir
  //   }))
  //
  //   inspect = stdout.inspect()
  //   await C.export.exec({
  //     path: 'file',
  //     encrypt: true,
  //     includeMe: true
  //   })
  //   inspect.restore()
  //   assertConsole(inspect, ['Exported file:', 'file.secrez'])
  //
  //   let content2 = await C.lcat.lcat({path: path.join(await C.lpwd.lpwd(), 'file')})
  //   assert.equal(content2, content)
  //
  //   inspect = stdout.inspect()
  //   await C.export.exec({
  //     path: 'file'
  //   })
  //   inspect.restore()
  //   assertConsole(inspect, ['Exported file:', 'file.2'])
  //
  //   content2 = await C.lcat.lcat({path: path.join(await C.lpwd.lpwd(), 'file.2')})
  //   assert.equal(content2, content)
  //
  // })

  it('should export a binary file to the current local folder', async function () {

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    await noPrint(C.lcd.exec({
      path: '../../test/fixtures/files/folder1'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'file1.tar.gz',
      binaryToo: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', '/folder/file1.tar.gz'])

    await noPrint(C.lcd.exec({
      path: '../../../../tmp/test'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file1.tar.gz'])

    let currFolder = await C.lpwd.lpwd()
    let result = await execAsync('file', currFolder, ['file1.tar.gz'])
    assert.isTrue(/gzip compressed data/.test(result.message))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file1.tar.gz.2'])

  })

  it('should export an encrypted file to the current local folder', async function () {

    await C.contacts.contacts({
      add: 'user1',
      publicKey: publicKeys.user1
    })

    await C.contacts.contacts({
      add: 'user2',
      publicKey: publicKeys.user2
    })

    await noPrint(C.mkdir.exec({
      path: '/folder'
    }))
    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    await noPrint(C.lcd.exec({
      path: '../../test/fixtures/files/folder1'
    }))

    inspect = stdout.inspect()
    await C.import.exec({
      path: 'file1.tar.gz',
      binaryToo: true
    })
    inspect.restore()
    assertConsole(inspect, ['Imported files:', '/folder/file1.tar.gz'])

    await noPrint(C.lcd.exec({
      path: '../../../../tmp/test'
    }))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz',
      encrypt: true,
      password: 'some weird password'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file1.tar.gz.secrezb'])

    let currFolder = await C.lpwd.lpwd()
    let result = await execAsync('file', currFolder, ['file1.tar.gz.secrezb'])
    assert.isTrue(/ASCII text/.test(result.message))

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz',
      encrypt: true,
      password: 'some weird password'
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file1.tar.gz.secrezb.2'])

    inspect = stdout.inspect()
    await C.export.exec({
      path: 'file1.tar.gz',
      encrypt: true,
      contacts: ['user1', 'user2']
    })
    inspect.restore()
    assertConsole(inspect, ['Exported file:', 'file1.tar.gz.secrezb.3'])

    currFolder = await C.lpwd.lpwd()
    result = await execAsync('file', currFolder, ['file1.tar.gz.secrezb.3'])
    assert.isTrue(/ASCII text/.test(result.message))

  })


  it('should export a file and delete it after 1 second', async function () {

    let content = 'Some secret'
    let p = '/folder/file'

    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    await noPrint(C.cd.exec({
      path: '/folder'
    }))

    await noPrint(
        C.export.exec({
      path: 'file',
      duration: 1
    }))

    let list = await C.lls.lls({path: await C.lpwd.lpwd()})
    assert.equal(list.length, 1)

    await sleep(1200)

    list = await C.lls.lls({path: await C.lpwd.lpwd()})
    assert.equal(list.length, 0)

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

})

