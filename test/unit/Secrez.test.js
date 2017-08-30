'use strict'

/* globals Promise */

const path = require('path')
const assert = require('assert')

function rRequire(m) {
  return require(path.resolve(process.cwd(), m))
}

const fs = rRequire('./src/utils/fs')
const Crypto = rRequire('./src/utils/Crypto')
const {status, keys, errors} = rRequire('./src/config/constants')
const Manifest = rRequire('./src/models/Manifest')
const Secrez = rRequire('./src/Secrez')
const Secret = rRequire('./src/models/Secret')

describe('Secrez', function () {

  let secrez
  let dataParentDir = path.resolve(__dirname, '../../tmp/.secrez')

  // Using private and public keys in fixtures. The private key does not have any password.
  process.env.PRIVATE_KEY = path.resolve(__dirname, '../fixtures/id_rsa')
  process.env.PUBLIC_KEY = path.resolve(__dirname, '../fixtures/id_rsa.pub')
  let password = 'the jumping in the sea'

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
    return fs.emptyDirAsync(dataParentDir)
  })

  after(function () {
    // return fs.emptyDirAsync(dataParentDir)
  })

  it('should construct the instance if process.env.DATA_PARENT_DIR', () => {
    process.env.DATA_PARENT_DIR = dataParentDir
    const s = new Secrez()
    assert(s.status === status.CONSTRUCTED)
    delete process.env.DATA_PARENT_DIR
  })

  it('should construct the instance if process.env.HOME', () => {
    const home = process.env.HOME
    process.env.HOME = dataParentDir
    const s = new Secrez()
    assert(s.status === status.CONSTRUCTED)
    process.env.HOME = home
  })

  it('should throw an error if trying to signup a not initialized secrez', () => {
    const s = new Secrez(dataParentDir)
    return s.signup(password)
        .catch(err => {
          assert(err === errors.NotInitialized)
        })
  })

  it('should throw an error if trying to login a not initialized secrez', () => {
    const s = new Secrez(dataParentDir)
    return s.login(password)
        .catch(err => {
          assert(err === errors.NotReady)
        })
  })

  it('should construct the instance passing dataParentDir', () => {
    const s = new Secrez(dataParentDir)
    assert(s.db)
    assert(/\.secrez/.test(s.dataParentDir))
    assert(s.db.dir === path.join(s.dataParentDir, 'database'))
    assert(s.status === status.CONSTRUCTED)
    secrez = s
  })

  it('should initialize the store', () => {
    return secrez.init()
        .then(() => {
          assert(secrez.manifest instanceof Manifest)
          assert(secrez.isInitiated())
        })
  })

  it('should proceed if the store if initiated', () => {
    return secrez.init()
        .then(() => {
          assert(secrez.manifest instanceof Manifest)
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
          assert(secrez.isOperative())
        })
  })

  it('should not init if the status is ready', () => {
    return secrez.init()
        .then(result => {
          assert(result === false)
        })
  })


  it('should logout', () => {
    return secrez.logout()
        .then(() => {
          assert(secrez.isReady())
        })
  })

  it('should throw an error trying to logout after logout', () => {
    return secrez.logout()
        .catch(err => {
          assert(err === errors.NotOperative)
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
          return secrez.getSecret(secretId)
        })
        .then(secret => {
          assert(secret.name === secretOptions.name)
          return secrez.getSecret('someInvalidId')
        })
        .catch(err => {
          assert(err === errors.InvalidID)
        })
  })

  it('should return a secret list', () => {
    return secrez.ls()
        .then(list => {
          assert(list[secretId].name === secretOptions.name)
        })
  })

  it('should logout and after logging in again recover the secret', () => {
    return secrez.logout()
        .then(() => secrez.login(password))
        .then(() => {
          assert(secrez.manifest.secrets[secretId])
        })
  })

  it('should empty onClose', () => {
    secrez.onClose()
    assert(secrez.manifest === undefined)
    assert(secrez.db === undefined)
  })

  it('should return default Secret Content Fields', () => {
    assert(Secrez.defaultSecretContentFields().length === Secret.contentFields().length)
  })


})
