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
  let hashStr3 = 'wrrDiVHDiW1LfcO6PCsSw4E1ccKEwpjDvsKCEUh/csK4w5PCuWjCtjQxwpvCp09Swrh+fQAXbcOUMMKswqvDv1XDtcOYw7nCmcOBwpVIfHkWw6PDuzLCvW7Dm1pww5c='
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
    assert(Crypto.SHA3(plainStr, 'base64') === hashStr3)
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