'use strict'

/* globals Promise */

const path = require('path')
const assert = require('assert')

function rRequire (m) {
  return require(path.resolve(process.cwd(), m))
}

const fs = rRequire('./lib/utils/fs')
const Crypto = rRequire('./lib/utils/Crypto')
const {status, keys} = rRequire('./lib/config/constants')
const Manifest = rRequire('./lib/models/Manifest')

describe('Psswrd', function () {

  let psswrd
  let password = 'a very yellow trip on a ferryboat in alaska'
  let secretOptions = {
    name: 'MyBank',
    content: {
      email: 'you@example.com',
      password: '8su3^%h2lK',
      publicKey: '0xyehdtwgd63tegdy3645et3gd'
    }
  }
  let secretId

  before(function () {
    return fs.emptyDirAsync(path.resolve(__dirname, '../../tmp/.psswrd'))
  })

  after(function () {
    // return fs.emptyDirAsync(path.resolve(__dirname, '../../tmp/.psswrd'))
  })

  it('should construct the instance', () => {
    return Promise.resolve(rRequire('./lib/Psswrd'))
        .then(p => {
          assert(p.db)
          assert(/\.psswrd$/.test(p.rootdir))
          assert(p.db.dir === path.join(p.rootdir, 'database'))
          assert(p.status === status.CONSTRUCTED)
          psswrd = p
        })
  })

  it('should initialize the store', () => {
    return psswrd.init()
        .then(() => {
          assert(psswrd.manifest instanceof Manifest)
          assert(psswrd.status === status.INITIATED)
        })
  })

  it('should return an error trying to login', () => {
    return psswrd.login(password)
        .catch(err => {
          assert(err)
        })
  })

  it('should signup and set up the master key', () => {
    return psswrd.signup(password)
        .then(() => {
          assert(psswrd.manifest.updatedAt > Crypto.timestamp() - 1)
          return psswrd.db.get(keys.MASTERKEY)
        })
        .then(encryptedMasterKey => {
          assert(encryptedMasterKey)
        })
  })

  it('should logout', () => {
    return psswrd.logout()
        .then(() => {
          assert(psswrd.is(status.READY))
        })
  })

  it('should login and recover the master key', () => {
    return psswrd.login(password)
        .then(() => {
          assert(psswrd.manifest.secrets)
        })
  })

  it('should add a secret', () => {
    return psswrd.setSecret(secretOptions)
        .then(() => {
          assert(psswrd.manifest.toJSON().s[0].n === secretOptions.name)
          secretId = psswrd.manifest.toJSON().s[0].i
        })
  })

  it('should logout and after logging in again recover the secret', () => {
    return psswrd.logout()
        .then(() => psswrd.login(password))
        .then(() => {
          assert(psswrd.manifest.secrets[secretId])
        })
  })


})
