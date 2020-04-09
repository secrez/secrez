const chai = require('chai')
const assert = chai.assert
const util = require('util')
const fs = require('fs-extra')
const path = require('path')
const {Secrez, config} = require('@secrez/core')
const Node = require('../src/Node')
const InternalFs = require('../src/InternalFs')
const {jsonEqual} = require('./helpers')
const {ENTRY_EXISTS} = require('../src/Messages')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let internalFs
  let root

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
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
      } catch (e) {
        assert.equal(e.message, 'InternalFs requires a Secrez instance during construction')
      }

    })

  })

  describe('normalizePath', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
    })

    it('should normalize a path', async function () {
      let p = 'casa/sasa/sasa/./cas/../../ra'
      assert.equal(internalFs.normalizePath(p), '/casa/sasa/ra')

      p = '~~~///casa/sasa//../../ra'
      assert.equal(internalFs.normalizePath(p), '/ra')

      p = '~~~///~/casa/~~/sasa//../ra'
      assert.equal(internalFs.normalizePath(p), '/casa/ra')

    })

    it('should throw if the path is empty, is not a string or is longer than 255 chars', async function () {

      try {
        let p = 123
        internalFs.normalizePath(p)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The "path" option must exist and be of type string')
      }

      try {
        internalFs.normalizePath()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The "path" option must exist and be of type string')
      }

      try {
        let p = '/vi/' + 'a'.repeat(300)
        internalFs.normalizePath(p)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'File names cannot be longer that 255 characters')
      }

    })
  })

  describe('make', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
      root = internalFs.tree.root
    })

    it('should create directories and files', async function () {

      let folder1 = await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })
      assert.equal(root.toCompressedJSON().c[0].v[0], '1')
      assert.equal(folder1.getName(), 'folder1')

      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })
      assert.equal(file1.getName(), 'file1')
      assert.equal(file1.getContent(), 'Password: 373u363y35e')
      // jlog(root.toCompressedJSON(null, 0))
      assert.equal(root.toCompressedJSON().c[0].c[0].v[0], '2')

      internalFs.tree.workingNode = folder1
      let file2 = await internalFs.make({
        path: 'file2',
        type: config.types.TEXT,
        content: 'PIN: 1234'
      })
      assert.equal(file2.getName(), 'file2')
      assert.equal(root.toCompressedJSON().c[0].c.length, 2)

      let dir = await internalFs.make({
        path: 'folder1/nodir/bilit/dir',
        type: config.types.TEXT
      })
      assert.equal(dir.getName(), 'dir')

    })

    it('should throw trying to re-add the same entry', async function () {

      await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })

      try {
        await internalFs.make({
          path: '/folder1',
          type: config.types.DIR
        })
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, util.format(ENTRY_EXISTS, 'folder1'))
      }
    })

  })

  describe('update', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
      root = internalFs.tree.root
    })

    it('should create directories and files and update them', async function () {

      let folder1 = await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })

      await internalFs.make({
        path: '/folder2',
        type: config.types.DIR
      })

      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })

      internalFs.tree.workingNode = folder1

      let file2 = await internalFs.make({
        path: 'file2',
        type: config.types.TEXT,
        content: 'PIN: 1234'
      })

      assert.equal(file1.getName(), 'file1')
      assert.equal(file2.getName(), 'file2')
      assert.equal(file2.getContent(), 'PIN: 1234')

      await internalFs.change({
        path: '/folder1/file1',
        newPath: '/folder1/file3',
        content: 'Some password'
      })

      assert.equal(file1.getName(), 'file3')
      assert.equal(file1.getContent(), 'Some password')
      assert.equal(file1.parent.getName(), 'folder1')

      await internalFs.change({
        path: '/folder1/file3',
        newPath: '/folder2/file4'
      })

      assert.equal(file1.getName(), 'file4')
      assert.equal(file1.parent.getName(), 'folder2')

      await internalFs.change({
        path: '/folder1/file2',
        content: 'PIN: 5678'
      })

      assert.equal(file2.getContent(), 'PIN: 5678')

      await internalFs.change({
        path: '/folder2/file4',
        newPath: '/folder1'
      })

      assert.equal(root.getChildFromPath('/folder1/file4').id, file1.id)

    })

  })

  describe('remove', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
      root = internalFs.tree.root
    })

    it('should remove a file from the tree', async function () {

      let folder1 = await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })

      await internalFs.make({
        path: 'folder1/file1',
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })

      assert.equal(Object.keys(folder1.children).length, 1)
      // jlog(root.toCompressedJSON(undefined, true))

      await internalFs.remove({
        path: '/folder1/file1'
      })

      // jlog(root.toCompressedJSON(undefined, true))

      assert.equal(Object.keys(folder1.children).length, 0)
    })

  })

  describe('load', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
    })

    it('should create directories and files and loading a tree from disk', async function () {

      await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })
      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })
      await internalFs.make({
        path: 'folder1/file2',
        type: config.types.TEXT,
        content: 'PIN: 1234'
      })

      let internalFs2 = new InternalFs(secrez)
      await internalFs2.init()
      root = internalFs2.tree.root

      let file1b = root.findChildById(file1.id)
      assert.equal(file1b.getName(), file1.getName())

      // jlog(root.toCompressedJSON(null, true))
      // jlog(internalFs.tree.root.toCompressedJSON(null, true))

      assert.isTrue(jsonEqual(root.toCompressedJSON(), internalFs.tree.root.toCompressedJSON()))

    })

    it('should create directories and files, delete one file and loading a tree from disk', async function () {

      await internalFs.make({
        path: '/folder1',
        type: config.types.DIR
      })
      let file1 = await internalFs.make({
        path: 'folder1/nodir/../file1',
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })

      await internalFs.make({
        path: 'folder1/' + 'a'.repeat(200),
        type: config.types.TEXT,
        content: 'Password: 373u363y35e'
      })

      await internalFs.make({
        path: 'folder1/file2',
        type: config.types.TEXT,
        content: 'PIN: 1234'
      })

      await internalFs.remove({
        path: 'folder1/file2'
      })

      let internalFs2 = new InternalFs(secrez)
      await internalFs2.init()
      root = internalFs2.tree.root

      let file1b = root.findChildById(file1.id)
      assert.equal(file1b.getName(), file1.getName())
      let json1 = root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())
      let json2 = internalFs.tree.root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())

      // jlog(json1)
      // jlog(json2)

      assert.isTrue(jsonEqual(json1, json2))

    })

    it('should create directories and files, delete everything and loading a tree from disk', async function () {

      await internalFs.make({
        path: '/folder1/file1',
        type: config.types.DIR
      })
      await internalFs.make({
        path: '/folder1/file2',
        type: config.types.DIR
      })
      await internalFs.remove({
        path: 'folder1'
      })

      let internalFs2 = new InternalFs(secrez)
      await internalFs2.init()
      root = internalFs2.tree.root


      let json1 = root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())
      let json2 = internalFs.tree.root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())

      assert.isTrue(jsonEqual(json1, json2))

    })


    it('should compress and reload an empty set of entries', async function () {

      let internalFs2 = new InternalFs(secrez)
      await internalFs2.init()
      root = internalFs2.tree.root


      let json1 = root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())
      let json2 = internalFs.tree.root.toCompressedJSON(null, null, await internalFs.tree.getAllFiles())

      assert.isTrue(jsonEqual(json1, json2))

    })

  })


})
