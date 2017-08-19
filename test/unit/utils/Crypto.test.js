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
  let hashStr3 = 'bac951c96d4b7dfa3c2b12c135718498fe8211487f72b8d3b968b634319ba74f52b87e7d00176dd430acabff55f5d8f999c195487c7916e3fb32bd6edb5a70d7'
  let password = 'a very yellow trip on a ferryboat in alaska'
  let encryptedStr = 'hEkTA4f7BMFpkWXcCcBdDS4jE8PqaFpwog6mhQZF8FU='

  it('should encode a string to base64', () => {
    const b64 = Crypto.toBase64(plainStr)
    assert(b64 === base64Str)
  })

  it('should decode a base64 string', () => {
    assert(plainStr, Crypto.fromBase64(base64Str))
  })

  it('should return a sha3 of a string', () => {
    assert(Crypto.toSHA3(plainStr, 'hex') === hashStr3)
  })

  it('should encode a string to AES 256', () => {
    assert(Crypto.toAES(plainStr, password) === encryptedStr)
  })

  it('should decode a string encrypted with AES 256', () => {
    assert(Crypto.fromAES(encryptedStr, password) === plainStr)
  })

  it('should derive a password and verify that it is deterministic', () => {

    const derived = Crypto.deriveKey(password, 'some-salt', 100000)
    const derived2 = Crypto.deriveKey(password, 'some-salt', 100000)
    assert(derived.toString('hex') === derived2.toString('hex'))
  })


})