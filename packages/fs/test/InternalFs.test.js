const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const InternalFs = require('../src/InternalFs')

describe('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let internalFs

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should instantiate the internal file system', async function () {

      internalFs = new InternalFs(secrez)
      assert.isTrue(!!internalFs.tree)

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

    it('should throw if file does not exist', async function () {

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


  describe('getNormalizedPath', async function () {

    it('should get the normalized path', async function () {

      internalFs = new InternalFs(secrez)
      assert.equal(internalFs.getNormalizedPath('~'), '/')
      assert.equal(internalFs.getNormalizedPath('.'), '/')
      assert.equal(internalFs.getNormalizedPath('../'), '/')
      assert.equal(internalFs.getNormalizedPath('tron'), '/tron')

    })
  })

  describe('mkdir', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should create a directory', async function() {



    })

  })


})
