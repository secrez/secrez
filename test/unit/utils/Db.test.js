'use strict'

/* globals Promise */

const path = require('path')
const assert = require('assert')

const fs = require('../../../src/utils/fs')
const Db = require('../../../src/utils/Db')
const db = new Db

describe('Db', function () {

  let dbDir = path.resolve(__dirname, '../../../tmp/.db')
  let someEncryptedData = 'c29tZXRpbWVzIGl0IHJhaW5z'
  let id

  after(function () {
    return fs.emptyDirAsync(dbDir)
  })

  it('should start the db', () => {
    db.init(dbDir)
    assert(fs.existsSync(dbDir))
    return Promise.resolve()
  })

  it('should return a new id', () => {
    assert(id = db.newId())
    return Promise.resolve()
  })

  it('should save some data', () => {
    return db.put(id, someEncryptedData)
        .then(() => {
          assert(fs.existsSync(path.join(dbDir, id)))
          return Promise.resolve()
        })
  })

  it('should read the saved data', () => {
    return db.get(id)
        .then(data => {
          assert(data === someEncryptedData)
          return Promise.resolve()
        })
  })
})