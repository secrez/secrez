const chai = require('chai')
const assert = chai.assert
const path = require('path')
const fs = require('fs-extra')
const DataCache = require('../src/DataCache')
const Secrez = require('@secrez/core').Secrez(Math.random())

const {
  password,
  iterations
} = require('./fixtures')

describe('#DataCache', function () {

  let testDir = path.resolve(__dirname, '../tmp/test')
  let rootDir = path.join(testDir, '.secrez')
  let cacheDir = path.join(testDir, '.secrez/cache')
  let dataCache
  let secrez

  beforeEach(async function () {
    await fs.emptyDir(testDir)
    secrez = new Secrez()
    await secrez.init(rootDir)
    await secrez.signup(password, iterations)
    dataCache = new DataCache(cacheDir, secrez)
  })

  it('should initialize a dataCache', async function () {
    assert.equal(dataCache.dataPath, cacheDir)
  })

  it('should put and get data', async function () {
    await dataCache.puts('key', ['one', 'two', 'three'])
    assert.equal(dataCache.list('key').length, 3)
    assert.isTrue(dataCache.is('key', 'two'))
    await dataCache.puts('key', ['zero'])
    assert.isTrue(dataCache.is('key', 'zero'))
  })

  it('should load data from disk, if any', async function () {
    await dataCache.load('key')
    await dataCache.puts('key', ['one', 'two', 'three'])
    dataCache = new DataCache(cacheDir)
    await dataCache.load('key')
    assert.equal(dataCache.list('key').length, 3)
    assert.isTrue(dataCache.is('key', 'two'))
  })

  it('should not load if no data', async function () {
    dataCache = new DataCache()
    assert.isFalse(await dataCache.load('none'))
  })

  it('should load plaintext data from disk, if any', async function () {

    await dataCache.load('encKey', true)
    await dataCache.puts('encKey', [{
      value: 'one', content: 'uno'
    }, {
      value: 'two', content: 'due'
    }, {
      value: 'three', content: 'tre'
    }])

    dataCache = new DataCache(cacheDir, secrez)

    await dataCache.load('encKey', true)
    assert.equal(dataCache.list('encKey').length, 3)
    assert.isTrue(dataCache.is('encKey', 'two'))

    await dataCache.remove('encKey', 'one')
    assert.equal(dataCache.list('encKey').length, 2)

    dataCache = new DataCache(cacheDir, secrez)

    await dataCache.load('encKey', true)
    assert.equal(dataCache.list('encKey').length, 2)

    await dataCache.puts('encKey', [{
      value: 'four'
    }], false, true)

    assert.equal(dataCache.list('encKey').length, 3)
  })

  it('should load encrypted data from disk, if any', async function () {

    dataCache.initEncryption('encKey')

    await dataCache.load('encKey', true)
    await dataCache.puts('encKey', [{
      value: 'one', content: 'uno'
    }, {
      value: 'two', content: 'due'
    }, {
      value: 'three', content: 'tre'
    }])

    dataCache = new DataCache(cacheDir, secrez)
    dataCache.initEncryption('encKey')

    await dataCache.load('encKey', true)
    assert.equal(dataCache.list('encKey').length, 3)
    assert.isTrue(dataCache.is('encKey', 'two'))

    await dataCache.remove('encKey', 'one')
    assert.equal(dataCache.list('encKey').length, 2)

    dataCache = new DataCache(cacheDir, secrez)
    dataCache.initEncryption('encKey')

    await dataCache.load('encKey', true)
    assert.equal(dataCache.list('encKey').length, 2)

    await dataCache.puts('encKey', [{
      value: 'four'
    }], false, true)

    assert.equal(dataCache.list('encKey').length, 3)
  })

})
