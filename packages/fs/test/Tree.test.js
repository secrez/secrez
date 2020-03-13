const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const Tree = require('../src/Tree')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Tree', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let tree

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
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
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should load an empty Tree', async function () {

      tree = new Tree(secrez)
      await tree.load(rootDir)
      assert.equal(tree.status, tree.statutes.LOADED)
      assert.equal(Object.keys(tree.tree.root[0]), 0)
      assert.equal(tree.tree.root[1][0][1], '/')

    })

    it('should do nothing if already loaded', async function () {

      tree = new Tree(secrez)
      await tree.load(rootDir)
      await tree.load(rootDir)
      assert.equal(tree.status, tree.statutes.LOADED)

    })

  })

  describe('#fileExists', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
    })

    it('should throw if file does not exist', async function () {

      try {
        tree.fileExists()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'File is required')
      }

      try {
        tree.fileExists(234)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'File is required')
      }

    })

  })

  describe('#sortItem', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
    })

    it('should sort an item in descending order', async function () {
      let t = [[2, 'a'], [3, 'b'], [1, 'c']]
      t.sort(Tree.sortItem)
      assert.equal(t[0][1], 'b')
    })

  })

  describe('#addChild', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should add a file, a folder and a file inside the folder', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile2', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild(undefined, {type: 2, ts: Date.now(), name: 'Some file', id: 'efgh', encryptedName: 'somefile2'})
      tree.addChild('abcd', {type: 2, ts: Date.now(), name: 'Some other file', id: 'opqr', encryptedName: 'somefile3'})

      assert.equal(tree.index.efgh[0], true)
      assert.equal(tree.index.efgh[1][0][1], 'Some file')
      assert.equal(tree.tree.root[0].abcd[0].opqr[0], true)
    })

    it('should throw if parent does not exist file', async function () {

      try {
        tree.addChild('carrubot', {type: 2, ts: Date.now(), name: 'Some file', id: 'abcd'})
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Parent does not exist')
      }
    })

    it('should throw if id already added', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})

      try {
        tree.addChild(undefined, {type: 1, ts: Date.now(), name: 'Some new folder', id: 'abcd'})
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Child already exists')
      }
    })

    it('should throw if file does not exist', async function () {

      try {
        tree.addChild(undefined, {type: 1, ts: Date.now(), name: 'Some new folder', id: 'abcd', encryptedName: 'something'})
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'The relative file does not exist')
      }
    })

  })


  describe('#updateChild', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should update a file and verify that there are more than one version', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile2', 'some')

      tree.addChild('root', {type: 2, ts: Date.now(), name: 'Some file', id: 'abcd', encryptedName: 'somefile'})

      tree.updateChild({type: 2, ts: Date.now() + 1, name: 'Some updated file', id: 'abcd', encryptedName: 'somefile2'})

      let item = tree.index.root[0].abcd
      assert.equal(Object.keys(item[1]).length, 2)
      assert.isTrue(item[1][0][0] > item[1][1][0])
    })

    it('should throw if child or file do not exist', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')

      tree.addChild('root', {type: 2, ts: Date.now(), name: 'Some file', id: 'abcd', encryptedName: 'somefile'})

      try {
        tree.updateChild({type: 1, ts: Date.now(), name: 'Some new folder', id: 'abcd', encryptedName: 'somefile2'})
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'The relative file does not exist')
      }

      try {
        tree.updateChild({type: 1, ts: Date.now(), name: 'Some new folder', id: 'cara', encryptedName: 'another file'})
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Child does not exist')
      }
    })

  })


  describe('#moveChild', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should move a file from inside a nested folder to another one', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile2', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')
      await fs.writeFile(rootDir + '/data/somefile4', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild('abcd', {type: 1, ts: Date.now(), name: 'Another folder', id: 'ijkm', encryptedName: 'somefile3'})
      tree.addChild('ijkm', {type: 2, ts: Date.now(), name: 'Some file', id: 'opqr', encryptedName: 'somefile4'})

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some other folder', id: 'efgh', encryptedName: 'somefile2'})

      tree.moveChild('efgh', 'opqr')

      assert.equal(tree.tree.root[0].abcd[0].ijkm[0].opqr, undefined)
      assert.equal(tree.tree.root[0].efgh[0].opqr[0], true)
    })

    it('should move an entire folder', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile2', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')
      await fs.writeFile(rootDir + '/data/somefile4', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild('abcd', {type: 1, ts: Date.now(), name: 'Another folder', id: 'ijkm', encryptedName: 'somefile3'})
      tree.addChild('ijkm', {type: 2, ts: Date.now(), name: 'Some file', id: 'opqr', encryptedName: 'somefile4'})

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some other folder', id: 'efgh', encryptedName: 'somefile2'})
      tree.moveChild('efgh', 'ijkm')
      assert.equal(tree.tree.root[0].abcd[0].ijkm, undefined)
      assert.equal(Object.keys(tree.tree.root[0].efgh[0].ijkm[0]).length, 1)
    })
  })


  describe('#deleteChild', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should update a file and verify that there are more than one version', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')

      tree.addChild('root', {type: 2, ts: Date.now(), name: 'Some file', id: 'abcd', encryptedName: 'somefile'})

      await fs.unlink(rootDir + '/data/somefile')

      tree.deleteChild('abcd')

      assert.equal(tree.tree.root[0].abcd, undefined)
    })

    it('should throw if a file is not deleted before deleting from tree', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile2', 'some')

      tree.addChild('root', {type: 2, ts: Date.now(), name: 'Some file', id: 'abcd', encryptedName: 'somefile'})
      tree.updateChild({type: 2, ts: Date.now() + 1, name: 'Some updated file', id: 'abcd', encryptedName: 'somefile2'})

      await fs.unlink(rootDir + '/data/somefile')

      try {
        tree.deleteChild('abcd')
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Can remove a child only if related files do not exist')
      }
    })

  })

  describe('#getPathTo', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should find a fullpath for a child', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')
      await fs.writeFile(rootDir + '/data/somefile4', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild('abcd', {type: 1, ts: Date.now(), name: 'Another folder', id: 'ijkm', encryptedName: 'somefile3'})
      tree.addChild('ijkm', {type: 2, ts: Date.now(), name: 'Some file', id: 'opqr', encryptedName: 'somefile4'})

      let fullpath = tree.getPathTo('opqr')

      assert.equal(fullpath, '/Some folder/Another folder/Some file')
    })

  })

  describe('#getChildFromPath', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      tree = new Tree(secrez)
      await tree.load(rootDir)
    })

    it('should find a child from a fullpath', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')
      await fs.writeFile(rootDir + '/data/somefile4', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild('abcd', {type: 1, ts: Date.now(), name: 'Another folder', id: 'ijkm', encryptedName: 'somefile3'})
      tree.addChild('ijkm', {type: 2, ts: Date.now(), name: 'Some file', id: 'opqr', encryptedName: 'somefile4'})

      let fullpath = '/Some folder/Another folder/Some file'
      let child = tree.getChildFromPath(fullpath)
      assert.equal(child[1][1], 'Some file')

    })


    it('should throw if path does not exists', async function () {

      await fs.writeFile(rootDir + '/data/somefile', 'some')
      await fs.writeFile(rootDir + '/data/somefile3', 'some')
      await fs.writeFile(rootDir + '/data/somefile4', 'some')

      tree.addChild('root', {type: 1, ts: Date.now(), name: 'Some folder', id: 'abcd', encryptedName: 'somefile'})
      tree.addChild('abcd', {type: 1, ts: Date.now(), name: 'Another folder', id: 'ijkm', encryptedName: 'somefile3'})
      tree.addChild('ijkm', {type: 2, ts: Date.now(), name: 'Some file', id: 'opqr', encryptedName: 'somefile4'})

      let fullpath = '/Some folder/Another folder/Not existent'

      try {
        tree.getChildFromPath(fullpath)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }
    })

  })

})
