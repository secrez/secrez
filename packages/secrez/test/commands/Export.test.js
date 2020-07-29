const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')

const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, noPrint, decolorize, sleep} = require('../helpers')

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

    await noPrint(C.export.exec({
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

