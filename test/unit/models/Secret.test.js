'use strict'

/* globals Promise */

const _ = require('lodash')
const path = require('path')
const assert = require('assert')

function rRequire(m) {
  return require(path.resolve(process.cwd(), m))
}

const fs = rRequire('./src/utils/fs')
const Secret = rRequire('./src/models/Secret')
const Db = rRequire('./src/utils/Db')
const Crypto = rRequire('./src/utils/Crypto')

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
    db.init(dbDir)
  })

  after(function () {
    return fs.emptyDirAsync(dbDir)
  })

  it('should construct a Secret instance', () => {
    secret = new Secret(db)
    secret.init(options)
    assert(_.isEqual(secret.content, options.content))
    assert(secret.id)
    assert(secret.key)
    assert(secret.salt)
    return Promise.resolve()
  })

  it('should instantiate an existent secret', () => {
    const json = {
      n: options.name,
      i: secret.id,
      k: Crypto.toBase64(secret.key),
      s: Crypto.toBase64(secret.salt),
      c: Crypto.timestamp(),
      v: secret.version
    }

    secret = new Secret(db)
    secret.init(json)
    assert(secret.id === json.i)
    assert(Crypto.toBase64(secret.key) === json.k)
    assert(Crypto.toBase64(secret.salt) === json.s)
    return Promise.resolve()
  })


  it('should update the secret', () => {
    return Promise.resolve(secret.update(options))
        .then(() => {
          assert(secret.version === 1)
          return Promise.resolve()
        })
  })

  it('should save the secret content', () => {
    return secret.save()
        .then(s => {
          assert(fs.existsSync(path.join(dbDir, secret.getVersionedFilename())))
          return Promise.resolve()
        })
  })

  it('should load the saved secret content', () => {
    secret.content = {}
    return secret.load()
        .then(s => {
          assert(secret.content.email === options.content.email)
          return Promise.resolve()
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
          return Promise.resolve()
        })
  })


  it('should empty the secret onClose', () => {
    secret.onClose()
    assert(secret.id === undefined)
    return Promise.resolve()
  })


})
