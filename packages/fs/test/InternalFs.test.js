const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')
const InternalFs = require('../src/InternalFs')

describe('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let internalFs

  describe('#constructor', async function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    it('should instantiate the internal file system', async function () {

      internalFs = new InternalFs(secrez)
      assert.equal(internalFs.itemId, 1)

    })

    it('should throw if passing not a Secrez instance', async function () {

      try {
        new InternalFs(new Object())
        assert.isFalse(true)
      } catch(e) {
        assert.equal(e.message, 'InternalFs requires secrez during construction')
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
