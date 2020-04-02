const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

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

describe('#Ls', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
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

  })

  it('should list folders and files', async function () {

    await C.mkdir.exec({path: '/dir1/dirA1'})
    await C.mkdir.exec({path: '/dir1/dirA2'})
    await C.mkdir.exec({path: '/dir1/dirB1'})
    await C.mkdir.exec({path: '/dir1/dirB2'})
    await C.mkdir.exec({path: '/dir1/dir2A'})
    await C.mkdir.exec({path: '/dir1/dir2B'})
    await C.mkdir.exec({path: '/dir1/dir2A/dir6'})
    await C.mkdir.exec({path: '/dir1/dir2A/dir7'})
    await C.touch.exec({path: '/dir1/file1'})
    await C.touch.exec({path: '/dir1/file2'})

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1', list: true})
    inspect.restore()
    assertConsole(inspect, ['dirA1/', 'dirA2/', 'dirB1/', 'dirB2/', 'dir2A/', 'dir2B/', 'file1', 'file2'])

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir2A', list: true})
    inspect.restore()
    assertConsole(inspect, ['dir6/', 'dir7/'])

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir2B', list: true})
    inspect.restore()
    assert.isTrue(inspect.output.length === 0)

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir2A/dir6', list: true})
    inspect.restore()
    assert.isTrue(inspect.output.length === 0)

  })

  it('should list folders and files using wildcards', async function () {

    await C.mkdir.exec({path: '/dir1/dirA1'})
    await C.mkdir.exec({path: '/dir1/dirA2'})
    await C.mkdir.exec({path: '/dir1/dirB1'})
    await C.mkdir.exec({path: '/dir1/dirB2'})
    await C.mkdir.exec({path: '/dir1/dir2A'})
    await C.mkdir.exec({path: '/dir1/dir2B'})
    await C.mkdir.exec({path: '/dir1/dorB3'})
    await C.mkdir.exec({path: '/dir1/dor3CC'})
    await C.mkdir.exec({path: '/dir1/dir2A/dir6'})
    await C.mkdir.exec({path: '/dir1/dir2A/dir7'})
    await C.touch.exec({path: '/dir1/file1'})
    await C.touch.exec({path: '/dir1/file2'})

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/d?rB?', list: true})
    inspect.restore()
    assertConsole(inspect, ['dirB1/', 'dirB2/', 'dorB3/'])

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir*', list: true})
    inspect.restore()
    assertConsole(inspect, ['dirA1/', 'dirA2/', 'dirB1/', 'dirB2/', 'dir2A/', 'dir2B/'])

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir?1', list: true})
    inspect.restore()
    assertConsole(inspect, ['dirA1/', 'dirB1/'])

    inspect = stdout.inspect()
    await C.ls.exec({path: '/dir1/dir[AB]*', list: true})
    inspect.restore()
    assertConsole(inspect, ['dirA1/', 'dirA2/', 'dirB1/', 'dirB2/'])

  })

})

