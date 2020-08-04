const stdout = require('test-console').stdout
const assert = require('chai').assert
const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')
const {Node} = require('@secrez/fs')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, decolorize} = require('@secrez/test-helpers')

const {
  password,
  iterations
} = require('../fixtures')

describe('#Rm', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: __dirname
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
    await C.rm.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[7]))

  })

  it('should delete a file with one version', async function () {

    let file1 = await C.touch.touch({
      path: '/folder2/file1',
      type: config.types.TEXT
    })

    inspect = stdout.inspect()
    await C.rm.exec({path: '/folder2/file1'})
    inspect.restore()
    assertConsole(inspect, [
      'Deleted entries:',
      '/folder2/file1'
    ])

    assert.equal(Node.getRoot(file1).datasetIndex, 1)

  })

  it('should delete many files usign wildcards', async function () {

    for (let i = 0; i < 3; i++) {

      await C.touch.touch({
        path: '/file' + i,
        type: config.types.TEXT
      })

    }

    inspect = stdout.inspect()
    await C.rm.exec({path: '/file*'})
    inspect.restore()
    assertConsole(inspect, [
      'Deleted entries:',
      '/file0',
      '/file1',
      '/file2'
    ])

    let ls = await C.ls.ls({path: '.'})

    assert.equal(ls.length, 0)

  })

  it('should return errors if wrong parameters', async function () {

    inspect = stdout.inspect()
    await C.rm.exec()
    inspect.restore()
    assertConsole(inspect, ['File path not specified.'])


    inspect = stdout.inspect()
    await C.rm.exec({
      path: 'file2'
    })
    inspect.restore()
    assertConsole(inspect, ['No files have been deleted.'])

    let expected = []
    let version
    for (let i = 0; i < 3; i++) {
      let file = await C.touch.touch({
        path: '/folder2/file' + i,
        type: config.types.TEXT
      })
      version = Node.hashVersion(Object.keys(file.versions)[0])
      expected.push(C.rm.formatResult({
        id: file.id,
        version,
        name: 'file' + i
      }))

    }

  })


  // it.only('should delete all the versions of a file', async function () {
  //
  //   let file1 = await C.touch.touch({
  //     path: '/folder2/file1',
  //     type: config.types.TEXT
  //   })
  //   let ver1 = Node.hashVersion(file1.lastTs)
  //
  //   // let expected = [C.rm.formatResult({
  //   //   id: file1.id,
  //   //   version: ver1,
  //   //   name: 'file1'
  //   // })]
  //
  //   await C.mv.mv({
  //     path: '/folder2/file1',
  //     newPath: '/folder2/file2'
  //   })
  //
  //   let ver2 = Node.hashVersion(file1.lastTs)
  //
  //   // expected.push(C.rm.formatResult({
  //   //   id: file1.id,
  //   //   version: ver2,
  //   //   name: 'file2'
  //   // }))
  //
  //
  //   await C.mv.mv({
  //     path: '/folder2/file2',
  //     newPath: '/folder2/file3'
  //   })
  //
  //   let ver3 = Node.hashVersion(file1.lastTs)
  //
  //   // expected.push(C.rm.formatResult({
  //   //   id: file1.id,
  //   //   version: ver3,
  //   //   name: 'file3'
  //   // }))
  //
  //   inspect = stdout.inspect()
  //   await C.rm.exec({path: '/folder2/file3'})
  //   inspect.restore()
  //   assertConsole(inspect, ['Deleted entries:',
  //     '/folder2/file3'
  //   ])
  //
  //   // jlog(root.toCompressedJSON())
  //
  // })

  // it('should delete only some version of a file', async function () {
  //
  //   let file1 = await C.touch.touch({
  //     path: 'file1',
  //     type: config.types.TEXT
  //   })
  //   let ver1 = Node.hashVersion(file1.lastTs)
  //
  //   let expected = [C.rm.formatResult({
  //     id: file1.id,
  //     version: ver1,
  //     name: 'file1'
  //   })]
  //
  //   await C.mv.mv({
  //     path: 'file1',
  //     newPath: 'file2'
  //   })
  //
  //   await C.mv.mv({
  //     path: 'file2',
  //     newPath: 'file3'
  //   })
  //
  //   inspect = stdout.inspect()
  //   await C.rm.exec({path: 'file3', versions: [ver1]})
  //   inspect.restore()
  //   assertConsole(inspect, [
  //     'Deleted entries:'
  //   ].concat(expected))
  //
  //   // jlog(root.toCompressedJSON(null, 1))
  //
  // })


})

