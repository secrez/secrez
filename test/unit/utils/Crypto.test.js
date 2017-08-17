'use strict'

/* globals Promise */

const assert = require('assert')
const path = require('path')

function rRequire(m) {
  return require(path.resolve(process.cwd(), m))
}

const Crypto = rRequire('./src/utils/Crypto')

describe('Crypto', function () {

  let plainStr = 'sometimes it rains'
  let base64Str = 'c29tZXRpbWVzIGl0IHJhaW5z'
  let salt = 'a bit of salt'
  let hashStr256 = 'e3f00e5e69e23dfbaf2f1079fa48d65eed8989fe69c1fce67dee54e72badbed3'
  let hashStr512 = '80a6e5048230893e5e5e46291593b9db56397f0e6933072ef9d7c3ebb91c9d18a2149d19001636a8a2edb01c93c79f5ebfec8237704217ea76637aa8bf66b8ac'
  let hashStr3 = 'bac951c96d4b7dfa3c2b12c135718498fe8211487f72b8d3b968b634319ba74f52b87e7d00176dd430acabff55f5d8f999c195487c7916e3fb32bd6edb5a70d7'
  let password = 'a very yellow trip on a ferryboat in alaska'
  let encryptedStr = 'hEkTA4f7BMFpkWXcCcBdDS4jE8PqaFpwog6mhQZF8FU='

  it('should encode a string to base64', () => {
    return Crypto.toBase64(plainStr)
        .then(b64 => {
          assert(b64 === base64Str)
        })
  })

  it('should decode a base64 string', () => {
    return Crypto.fromBase64(base64Str)
        .then(str => {
          assert(str === plainStr)
        })
  })

  it('should return a sha256 of a string', () => {
    return Crypto.toSHA256(plainStr, salt, 'hex')
        .then(hash256 => {
          assert(hash256 === hashStr256)
        })
  })

  it('should return a sha512 of a string', () => {
    return Crypto.toSHA512(plainStr, salt, 'hex')
        .then(hash512 => {
          assert(hash512 === hashStr512)
        })
  })

  // it('should return a sha3 of a string', () => {
  //   return Crypto.toSHA3(plainStr, 'hex')
  //       .then(hash3 => {
  //         assert(hash3 === hashStr3)
  //       })
  // })

  it('should encode a string to AES 256', () => {
    return Crypto.toAES(plainStr, password)
        .then(encrypted => {
          assert(encrypted === encryptedStr)
        })
  })

  it('should decode a string encrypted with AES 256', () => {
    return Crypto.fromAES(encryptedStr, password)
        .then(decrypted => {
          assert(decrypted === plainStr)
        })
  })

  // it('should generate a bcrypt hash and verify it', () => {
  //
  //   return Crypto.bcryptHash(password)
  //       .then(hash => {
  //         assert(Crypto.bcryptCompare(password, hash, SYNC) === true)
  //       })
  // })

  it('should derive a password and verify that it is deterministic', () => {

    return Crypto.deriveKey(password, 'some-salt', 100000)
        .then(derived => Promise.all([
          Crypto.deriveKey(password, 'some-salt', 100000),
          derived
        ]))
        .then(([derived2, derived]) => {
          assert(derived.toString('hex') === derived2.toString('hex'))
        })
  })


})