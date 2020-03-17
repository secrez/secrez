const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez, config} = require('@secrez/core')
const Node = require('../src/Node')
const InternalFs = require('../src/InternalFs')
const {initRandomEntry, compareJson} = require('./helpers')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe.only('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  const D = config.types.DIR
  const F = config.types.FILE
  let internalFs
  let root

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should instantiate the internal file system and initialize it', async function () {

      internalFs = new InternalFs(secrez)
      assert.isTrue(!!internalFs.tree)

    })

    it('should initialize the internal fs', async function () {

      internalFs = new InternalFs(secrez)
      assert.isTrue(!!internalFs.tree)

      await internalFs.init()
      assert.isTrue(Node.isRoot(internalFs.tree.root))

    })

    it('should throw if passing not a Secrez instance', async function () {

      try {
        new InternalFs(new Object())
        assert.isFalse(true)
      } catch(e) {
        assert.equal(e.message, 'InternalFs requires a Secrez instance during construction')
      }

    })

  })

  describe('#fileExists', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      internalFs = new InternalFs(secrez)
    })

    it('should confirm that a file exists or not', async function () {

      await fs.writeFile(path.join(secrez.config.dataPath, 'somefile'), 'some content')
      assert.isTrue(internalFs.fileExists('somefile'))
      assert.isFalse(internalFs.fileExists('someotherfile'))

    })

    it('should throw if file name is invalid', async function () {

      try {
        internalFs.fileExists()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'A valid file name is required')
      }

      try {
        internalFs.fileExists(234)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'A valid file name is required')
      }

    })

  })

  describe('make', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
      root = internalFs.tree.root
    })

    it('should create directories and files', async function() {

      let folder1 = await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })
      assert.equal(root.toJSON().c[0].v[0], '1')
      assert.equal(folder1.getName(), 'folder1')

      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.FILE,
        content: 'Password: 373u363y35e'
      })
      assert.equal(file1.getName(), 'file1')
      assert.equal(root.toJSON().c[0].c[0].v[0], '2')

      internalFs.tree.workingNode = folder1
      let file2 = await internalFs.make({
        path: 'file2',
        type: config.types.FILE,
        content: 'PIN: 1234'
      })
      assert.equal(file2.getName(), 'file2')
      assert.equal(root.toJSON().c[0].c.length, 2)
    })

  })

  describe('load', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
    })

    it('should create directories and files and loading a tree from disk', async function() {

      await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })
      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.FILE,
        content: 'Password: 373u363y35e'
      })
      await internalFs.make({
        path: 'folder1/file2',
        type: config.types.FILE,
        content: 'PIN: 1234'
      })

      let internalFs2 = new InternalFs(secrez)
      await internalFs2.init()
      await internalFs2.tree.load()
      root = internalFs2.tree.root

      let file1b = root.findChildById(file1.id)
      assert.equal(file1b.getName(), file1.getName())
      assert.isTrue(compareJson(root.toJSON(), internalFs.tree.root.toJSON()))

    })

  })


})
