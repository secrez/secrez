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

describe('Secrez', function () {

  let secrez
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
    return fs.emptyDirAsync(path.resolve(__dirname, '../../tmp/.secrez'))
  })

  after(function () {
    return fs.emptyDirAsync(path.resolve(__dirname, '../../tmp/.secrez'))
  })

  it('should construct the instance', () => {
    return Promise.resolve(rRequire('./lib/Secrez'))
        .then(s => {
          assert(s.db)
          assert(/\.secrez/.test(s.datadir))
          assert(s.db.dir === path.join(s.datadir, 'database'))
          assert(s.status === status.CONSTRUCTED)
          secrez = s
        })
  })

  it('should initialize the store', () => {
    return secrez.init()
        .then(() => {
          assert(secrez.manifest instanceof Manifest)
          assert(secrez.status === status.INITIATED)
        })
  })

  it('should return an error trying to login', () => {
    return secrez.login(password)
        .catch(err => {
          assert(err)
        })
  })

  it('should signup and set up the master key', () => {
    return secrez.signup(password)
        .then(() => {
          assert(secrez.manifest.updatedAt > Crypto.timestamp() - 1)
          return secrez.db.get(keys.MASTERKEY)
        })
        .then(encryptedMasterKey => {
          assert(encryptedMasterKey)
        })
  })

  it('should logout', () => {
    return secrez.logout()
        .then(() => {
          assert(secrez.is(status.READY))
        })
  })

  it('should login and recover the master key', () => {
    return secrez.login(password)
        .then(() => {
          assert(secrez.manifest.secrets)
        })
  })

  it('should add a secret', () => {
    return secrez.setSecret(secretOptions)
        .then(() => {
          assert(secrez.manifest.toJSON().s[0].n === secretOptions.name)
          secretId = secrez.manifest.toJSON().s[0].i
        })
  })

  it('should logout and after logging in again recover the secret', () => {
    return secrez.logout()
        .then(() => secrez.login(password))
        .then(() => {
          assert(secrez.manifest.secrets[secretId])
        })
  })


})
