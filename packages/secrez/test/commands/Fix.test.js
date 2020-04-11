const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')

const {Tree} = require('@secrez/fs')

const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe.only('#Fix', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C
  let tree

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
  })

  let signedUp = false

  async function startTree() {
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    if (signedUp) {
      await prompt.secrez.signin(password, iterations)
    } else {
      await prompt.secrez.signup(password, iterations)
      signedUp = true
    }
    await prompt.internalFs.init()
    tree = prompt.internalFs.tree
  }

  it.only('should simulate a conflict in the repo and recover lost entries', async function () {

    await startTree()

    let backup = path.resolve(__dirname, '../../tmp/test/backup')
    await fs.emptyDir(backup)

    await noPrint(C.mkdir.exec({path: '/A/D'}))
    await noPrint(C.mkdir.exec({path: '/A/E'}))
    await noPrint(C.touch.exec({path: '/A/a'}))
    await noPrint(C.touch.exec({path: '/B/D/c'}))
    await noPrint(C.touch.exec({path: '/B/D/c'}))
    await noPrint(C.mkdir.exec({path: '/B/E/G'}))
    await noPrint(C.mkdir.exec({path: '/C/F/H'}))
    await noPrint(C.mkdir.exec({path: '/C/F/J'}))
    await noPrint(C.touch.exec({path: '/C/c'}))

    let files1 = await fs.readdir(`${rootDir}/data`)

    inspect = stdout.inspect()
    await C.fix.exec()
    inspect.restore()
    assertConsole(inspect, 'Nothing to fix here.')

    await startTree()

    await noPrint(C.mkdir.exec({path: '/A/K'}))
    await noPrint(C.touch.exec({path: '/B/E/d'}))
    await noPrint(C.touch.exec({path: '/e'}))
    delete tree.previousRootEntry


    let files2 = await fs.readdir(`${rootDir}/data`)
    let files3 = []

    for (let f of files2) {
      if (!files1.includes(f)) {
        files3.push(f)
        await fs.move(`${rootDir}/data/${f}`, `${backup}/${f}`)
      }
    }

    await startTree()

    await noPrint(C.mkdir.exec({path: '/A/K'}))
    await noPrint(C.touch.exec({path: '/M/N/f'}))
    await noPrint(C.touch.exec({path: '/C/F/k'}))
    delete tree.previousRootEntry

    for (let f of files3) {
        await fs.move(`${backup}/${f}`, `${rootDir}/data/${f}`)
    }

    await startTree()

    assert.equal(tree.alerts[0], 'Some files are missing in the tree. Run "fix" to recover them.')

    inspect = stdout.inspect()
    await C.fix.exec()
    inspect.restore()
    assertConsole(inspect, 'Nothing to fix here.')


  })

})

