const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const Node = require('../src/Node')
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
        assert.equal(e.message, 'A valid file name is required')
      }

      try {
        tree.fileExists(234)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'A valid file name is required')
      }

    })

  })

})
