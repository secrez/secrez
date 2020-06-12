const chai = require('chai')
const assert = chai.assert
const path = require('path')
const fs = require('fs-extra')
const DataCache = require('../src/DataCache')
const {sleep} = require('./helpers')

describe('#DataCache', function () {

  let cacheDir = path.resolve(__dirname, '../tmp/cache')

  beforeEach(async function () {
    await fs.emptyDir(cacheDir)
  })

  it('should initialize a dataCache', async function () {
    let dataCache = new DataCache(cacheDir)
    assert.equal(dataCache.dataPath, cacheDir)
  })

  it('should put and get data', async function () {
    let dataCache = new DataCache(cacheDir)
    await dataCache.puts('key', ['one', 'two', 'three'])
    assert.equal(dataCache.get('key').length, 3)
    assert.isTrue(dataCache.is('key', 'two'))
    dataCache.puts('key', ['zero'], false, true)
    await sleep(100)
    assert.isTrue(dataCache.is('key', 'zero'))
  })

  it('should load data from disk, if any', async function () {
    let dataCache = new DataCache(cacheDir)
    await dataCache.puts('key', ['one', 'two', 'three'])
    dataCache = new DataCache(cacheDir)
    await dataCache.load('key')
    assert.equal(dataCache.get('key').length, 3)
    assert.isTrue(dataCache.is('key', 'two'))
  })





})
