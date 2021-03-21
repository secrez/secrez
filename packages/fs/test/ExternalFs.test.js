const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')

const ExternalFs = require('../src/ExternalFs')

describe('#ExternalFs', function () {

  let secrez
  let externalFs
  let container = path.resolve(__dirname, '../tmp/test/.secrez')
  let localDir = path.resolve(__dirname, '.')
  let somePassword = 'I have seen the double green light'

  const otherSecrez = []

  before(async function () {
    await fs.emptyDir(container)
    secrez = new (Secrez())
    await secrez.init(container, localDir)
    await secrez.signup(somePassword, 1000)
    externalFs = new ExternalFs(secrez)

    for (let i = 0; i < 3; i++) {
      let currDir = container + i
      await fs.emptyDir(currDir)
      otherSecrez[i] = new (Secrez())
      await otherSecrez[i].init(currDir)
      await otherSecrez[i].signup(somePassword, 1000)
    }
  })


  describe('getNormalizedPath', async function () {

    let dir

    it('should normalize "~/fileSystems"', async function () {
      dir = '~/fileSystems'
      assert.equal(externalFs.getNormalizedPath(dir), path.join(localDir, 'fileSystems'))

    })

    it('should normalize "~"', async function () {
      dir = '~'
      assert.equal(externalFs.getNormalizedPath(dir), localDir)

    })

    it('should normalize "/var"', async function () {
      dir = '/var'
      assert.equal(externalFs.getNormalizedPath(dir), '/var')

    })

  })


  describe('fileCompletion', async function () {

    let files
    let results

    it('should return a list of files', async function () {
      files = './fixtures/tree'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 4)

    })

    it('should return a list of only directories', async function () {
      files = './fixtures/tree'
      results = await externalFs.getFileList({path: files, dironly: true})
      assert.equal(results.length, 1)

    })

    it('should return a list of only files', async function () {
      files = './fixtures/tree'
      results = await externalFs.getFileList({path: files, fileonly: true})
      assert.equal(results.length, 3)

    })

    it('should return the file itself, if it is not a directory', async function () {
      files = './fixtures/tree/a'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 1)
      assert.equal(results[0], 'a')

    })

    it('should return the list of the files satisfying wildcards', async function () {
      files = './fixtures/tree/d/a1*'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 2)

      files = './fixtures/tree/d/a*'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 3)

      files = './fixtures/tree/d/?1*'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 3)

      files = './fixtures/tree/d/*b?'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 3)

    })

    it('should return an empty list if the files does not exist', async function () {
      files = 'somefile.txt'
      results = await externalFs.getFileList({path: files})
      assert.equal(results.length, 0)

    })


  })

  describe('getVersionedBasename', async function () {

    it('should version a file', async function () {
      let versioned = await externalFs.getVersionedBasename('./fixtures/tree/a')
      assert.equal(versioned, 'a.2')
    })


  })

  describe('isDir', async function () {

    let dir

    it('should confirm that "utils" is a dir', async function () {
      dir = externalFs.getNormalizedPath('fixtures')
      assert.isTrue(await externalFs.isDir(dir))

    })

    it('should return that "config.test.js" is not a dir', async function () {
      dir = externalFs.getNormalizedPath('../src/utils/index.js')
      assert.isFalse(await externalFs.isDir(dir))
    })

    it('should return that a not-existent file is not a dir', async function () {
      dir = externalFs.getNormalizedPath('jobs.text')
      assert.isFalse(await externalFs.isDir(dir))
    })


  })

  describe('isFile', async function () {

    let file

    it('should return that "config.test.js" is a file', async function () {
      file = externalFs.getNormalizedPath('InternalFs.test.js')
      assert.isTrue(await externalFs.isFile(file))
    })

    it('should confirm that "utils" is not a file', async function () {
      file = externalFs.getNormalizedPath('utils')
      assert.isFalse(await externalFs.isFile(file))

    })

    it('should return that a not-existent file is not a dir', async function () {
      file = externalFs.getNormalizedPath('jobs.text')
      assert.isFalse(await externalFs.isFile(file))
    })
  })

})
