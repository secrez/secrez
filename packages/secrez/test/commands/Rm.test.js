const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout

const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')
const {Node} = require('@secrez/fs')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Rm', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C
  let root

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
    root = prompt.internalFs.tree.root
  })

  it('should delete a file with one version', async function () {

    let file1 = await C.touch.touch({
      path: '/folder2/file1',
      type: config.types.TEXT
    })
    let expected = C.rm.formatResult({
      id: file1.id,
      version: Node.hashVersion(Object.keys(file1.versions)[0]),
      name: 'file1'
    })

    inspect = stdout.inspect()
    await C.rm.exec({path: '/folder2/file1'})
    inspect.restore()
    assertConsole(inspect, [
      'Deleted entries:',
      expected
    ])

    // jlog(root.toCompressedJSON())
  })


  it('should delete all the versions of a file', async function () {

    let file1 = await C.touch.touch({
      path: '/folder2/file1',
      type: config.types.TEXT
    })
    let ver1 = Node.hashVersion(file1.lastTs)

    let expected = [C.rm.formatResult({
      id: file1.id,
      version: ver1,
      name: 'file1'
    })]

    await C.mv.mv({
      path: '/folder2/file1',
      newPath: '/folder2/file2'
    })

    let ver2 = Node.hashVersion(file1.lastTs)

    expected.push(C.rm.formatResult({
      id: file1.id,
      version: ver2,
      name: 'file2'
    }))


    await C.mv.mv({
      path: '/folder2/file2',
      newPath: '/folder2/file3'
    })

    let ver3 = Node.hashVersion(file1.lastTs)

    expected.push(C.rm.formatResult({
      id: file1.id,
      version: ver3,
      name: 'file3'
    }))

    inspect = stdout.inspect()
    await C.rm.exec({path: '/folder2/file3'})
    inspect.restore()
    assertConsole(inspect, ['Deleted entries:'].concat(expected))

    // jlog(root.toCompressedJSON())

  })

  it('should delete only some version of a file', async function () {

    let file1 = await C.touch.touch({
      path: 'file1',
      type: config.types.TEXT
    })
    let ver1 = Node.hashVersion(file1.lastTs)

    let expected = [C.rm.formatResult({
      id: file1.id,
      version: ver1,
      name: 'file1'
    })]

    await C.mv.mv({
      path: 'file1',
      newPath: 'file2'
    })

    await C.mv.mv({
      path: 'file2',
      newPath: 'file3'
    })

    inspect = stdout.inspect()
    await C.rm.exec({path: 'file3', versions: [ver1]})
    inspect.restore()
    assertConsole(inspect, [
      'Deleted entries:'
      ].concat(expected))

    jlog(root.toCompressedJSON(null, 1))

  })


})

