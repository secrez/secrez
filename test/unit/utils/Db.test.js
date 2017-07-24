'use strict'

/* globals Promise */

const path = require('path')
const assert = require('assert')

const fs = require('../../../lib/utils/fs')
const Db = require('../../../lib/utils/Db')
const db = new Db

describe('Db', function () {

  let dbDir = path.resolve(__dirname, '../../../tmp/.db')
  let someEncryptedData = 'c29tZXRpbWVzIGl0IHJhaW5z'
  let id

  after(function () {
    return fs.emptyDirAsync(dbDir)
  })

  it('should start the db', () => {
    return db.init(dbDir)
        .then(() => assert(fs.existsDir(dbDir)))
  })

  it('should return a new id', () => {

    return db.newId()
        .then(newId => {
          return Promise.resolve(assert(id = newId))
        })
  })

  it('should save some data', () => {
    return db.put(id, someEncryptedData)
        .then(() => {
          assert(fs.existsSync(path.join(dbDir, id)))
        })
  })

  it('should read the saved data', () => {
    return db.get(id)
        .then(data => {
          assert(data === someEncryptedData)
        })
  })
})