const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const Node = require('../src/Node')
const InternalFs = require('../src/InternalFs')
const {initRandomNode} = require('./helpers')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe.only('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let internalFs

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

  describe('mkdir', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      internalFs = new InternalFs(secrez)
      await internalFs.init()
    })

    it('should create directories and files', async function() {




    })

  })


})
