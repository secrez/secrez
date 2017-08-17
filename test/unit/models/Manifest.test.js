'use strict'

/* globals Promise */

const path = require('path')
const assert = require('assert')
function rRequire (m) {
  return require(path.resolve(process.cwd(), m))
}

const fs = rRequire('./src/utils/fs')
const { SYNC } = rRequire('./src/config/constants')
const Manifest = rRequire('./src/models/Manifest')
const Db = rRequire('./src/utils/Db')
const Crypto = rRequire('./src/utils/Crypto')

describe('Manifest', function () {

  let dbDir = path.resolve(__dirname, '../../../tmp/.manifest')
  let db = new Db
  let manifest = new Manifest(db)
  let masterKey = Crypto.getRandomString(64, null, SYNC)
  let secretId

  let secretOptions = {
    name: 'MyBank',
    content: {
      email: 'you@example.com',
      password: '8su3^%h2lK'
    }
  }

  before(function () {
    db.init(dbDir, SYNC)
  })

  after(function () {
    return fs.emptyDirAsync(dbDir)
  })

  it('should initiate the manifest', () => {

    return manifest.init(masterKey)
        .then(() => {
          assert(manifest.updatedAt > Crypto.timestamp() - 1)
        })
  })

  it('should add a secret to the manifest', () => {

    return manifest.setSecret(secretOptions)
        .then(() => {
          assert(manifest.toJSON().s[0].n === secretOptions.name)
          secretId = manifest.toJSON().s[0].i
        })
  })

  it('should load the saved manifest', () => {
    manifest = new Manifest(db)
    return manifest.init(masterKey)
        .then(() => {
          for (let id in manifest.secrets) {
            assert(id === secretId)
          }
        })

  })


})
