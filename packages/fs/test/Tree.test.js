const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const Node = require('../src/Node')
const Tree = require('../src/Tree')
const InternalFs = require('../src/InternalFs')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

const {
  password,
  iterations
} = require('./fixtures')

describe('#Tree', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let tree

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should instantiate the Tree', async function () {

      tree = new Tree(secrez)
      assert.equal(tree.status, tree.statutes.UNLOADED)

    })

    it('should throw if passing not an Secrez instance', async function () {

      try {
        new Tree(new Object())
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Tree requires a Secrez instance during construction')
      }

    })

  })

  describe('#load', async function () {

    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should load an empty Tree', async function () {

      tree = new Tree(secrez)
      await tree.load()
      assert.equal(tree.status, tree.statutes.LOADED)
      assert.equal(Node.isRoot(tree.root), true)

    })

    it('should do nothing if already loaded', async function () {

      tree = new Tree(secrez)
      await tree.load(rootDir)
      await tree.load(rootDir)
      assert.equal(tree.status, tree.statutes.LOADED)

    })

  })

  describe.only('#Fix', function () {

    let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
    let internalFs

    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
    })

    let signedUp = false

    async function startTree() {
      secrez = new Secrez()
      await secrez.init(rootDir)
      if (signedUp) {
        await secrez.signin(password, iterations)
      } else {
        await secrez.signup(password, iterations)
        signedUp = true
      }
      internalFs = new InternalFs(secrez)
      await internalFs.init()
      tree = internalFs.tree
    }

    it('should simulate a conflict in the repo and recover lost entries', async function () {

      await startTree()

      let files0 = await fs.readdir(`${rootDir}/data`)
      assert.equal(files0.length, 0)

      let backup = path.resolve(__dirname, '../../tmp/test/backup')
      await fs.emptyDir(backup)

      await internalFs.make({
        path: '/A/B',
        type: secrez.config.types.DIR
      })
      await internalFs.make({
        path: '/A/C',
        type: secrez.config.types.DIR
      })

      await internalFs.make({
        path: '/A/a',
        type: secrez.config.types.TEXT
      })

      await internalFs.make({
        path: '/B/b',
        type: secrez.config.types.TEXT
      })

      // jlog(tree.root)

      let files1 = await fs.readdir(`${rootDir}/data`)

      // console.log(files1)

      assert.equal(files1.length, 9)

      // inspect = stdout.inspect()
      // await C.fix.exec()
      // inspect.restore()
      // assertConsole(inspect, 'Nothing to fix here.')

      await startTree()

      await internalFs.make({
        path: '/B/D',
        type: secrez.config.types.DIR
      })

      await internalFs.make({
        path: '/E/c',
        type: secrez.config.types.TEXT
      })

      let files2 = await fs.readdir(`${rootDir}/data`)

      assert.equal(files2.length, 28)

      let files3 = []

      for (let f of files2) {
        if (!files1.includes(f)) {
          files3.push(f)
          await fs.move(`${rootDir}/data/${f}`, `${backup}/${f}`)
        }
      }

      await startTree()

      await internalFs.make({
        path: '/B/D',
        type: secrez.config.types.DIR
      })

      await internalFs.make({
        path: '/E/F/d',
        type: secrez.config.types.TEXT
      })

      for (let f of files3) {
        await fs.move(`${backup}/${f}`, `${rootDir}/data/${f}`)
      }

      // console.log(99)

      await startTree()

      // assert.equal(tree.alerts[0], 'Some files are missing in the tree. Run "fix" to recover them.')

      // inspect = stdout.inspect()
      // await C.fix.exec()
      // inspect.restore()
      // assertConsole(inspect, 'Nothing to fix here.')


    })

  })

})
