'use strict'

/* globals Promise */

const _ = require('lodash')
const path = require('path')
const assert = require('assert')
function rRequire (m) {
  return require(path.resolve(process.cwd(), m))
}

const fs = rRequire('./lib/utils/fs')
const { SYNC } = rRequire('./lib/config/constants')
const Secret = rRequire('./lib/models/Secret')
const Db = rRequire('./lib/utils/Db')
const Crypto = rRequire('./lib/utils/Crypto')

describe('Secret', function () {

  const dbDir = path.resolve(__dirname, '../../../tmp/.secret')
  const db = new Db
  const options = {
    name: 'MyBank',
    content: {
      email: 'you@example.com',
      password: '8su3^%h2lK'
    }
  }
  const password2 = '*J^3h^2jse'
  let secret

  before(function () {
    db.init(dbDir, SYNC)
  })

  after(function () {
    return fs.emptyDirAsync(dbDir)
  })

  it('should construct a Secret instance', () => {
    secret = new Secret(db)
    return secret.init(options)
        .then(() => {
          assert(_.isEqual(secret.content, options.content))
          assert(secret.id)
          assert(secret.key)
          assert(secret.salt)
        })
  })

  it('should instantiate an existent secret', () => {
    const json = {
      n: options.name,
      i: secret.id,
      k: Crypto.toBase64(secret.key, SYNC),
      s: Crypto.toBase64(secret.salt, SYNC),
      c: Crypto.timestamp(),
      v: secret.version
    }

    secret = new Secret(db)
    return secret.init(json)
        .then(() => {
          assert(secret.id === json.i)
          assert(Crypto.toBase64(secret.key, SYNC) === json.k)
          assert(Crypto.toBase64(secret.salt, SYNC) === json.s)
        })
  })


  it('should update the secret', () => {
    return Promise.resolve(secret.update(options))
        .then(() => {
          assert(secret.version === 1)
        })
  })

  it('should save the secret content', () => {
    return secret.save()
        .then(s => {
          assert(fs.existsSync(path.join(dbDir, secret.getVersionedFilename(SYNC))))
        })
  })

  it('should load the saved secret content', () => {
    secret.content = {}
    return secret.load()
        .then(s => {
          assert(secret.content.email === options.content.email)
        })
  })

  it('should update the secret adding new data', () => {
    options.content.password = password2
    return Promise.resolve(secret.update(options))
        .then(() => {
          assert(secret.version === 2)
          return secret.save()
        })
        .then(() => {
          secret.content = {}
          return secret.load()
        })
        .then(() => {
          assert(_.isEqual(secret.content, options.content))
        })
  })


  it('should empty the secret onClose', () => {
    secret.onClose()
    assert(secret.id === undefined)
  })




})
