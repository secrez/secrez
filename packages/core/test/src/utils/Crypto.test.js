const chai = require('chai')
const assert = chai.assert
const Crypto = require('../../../src/utils/Crypto')
const helpers = require('../../helpers')

describe('#Crypto', function () {

  let password = 'unaSTRANA342'
  let b58Hash = 'J5JDehfYiYFyRcySdHQNiCJdVrsrUyVtpCEXU7fBQ6q3'
  let passwordSHA3Hex = 'fdb07834d77b30a750f3b14ab06b000730ee2f2bb52a842fc78d72d88c82038e'
  let passwordB64 = 'dW5hU1RSQU5BMzQy'
  let salt = 'someSalt'
  let iterations = 23456
  let iterationsB58 = '7Yq'
  let hash23456iterations = 'GCF7ytpi9DyMPbuDhLj6vW1oSe99nBTLzABcb1qvTeLY'

  describe('#utils', async function () {

    it('should encode an integer as a base58 string', async function () {
      let encoded = Crypto.decimalToBase58(iterations)
      assert.equal(encoded, iterationsB58)
    })

    it('should decode a base58 string to an integer', async function () {
      let decoded = Crypto.base58ToDecimal(iterationsB58)
      assert.equal(decoded, iterations)
    })

    it('should encode a string as base64', async function () {
      let coded = Crypto.toBase64(password)
      assert.equal(coded, passwordB64)
    })

    it('should decode a base64 string', async function () {
      let decoded = Crypto.fromBase64(passwordB64)
      assert.equal(decoded, password)
    })

    it('should get a random IV', async function () {
      let iv = Crypto.getRandomIv()
      assert.equal(iv.length, 16)
    })

    it('should SHA3 a string', async function () {
      assert.isTrue(helpers.bufferEquals(Crypto.SHA3(password), Buffer.from(passwordSHA3Hex, 'hex')))
    })

    it('should derive a password and obtain a predeterminded hash', async function () {
      let derivedPassword = await Crypto.deriveKey(password, salt, iterations)
      assert.equal(Crypto.b58Hash(derivedPassword), hash23456iterations)
    })

    it('should generate a random string', async function () {
      let randomString = await Crypto.getRandomString(12, 'hex')
      assert.equal(randomString.length, 24)
    })

    it('should get the current timestamp in standard format', async function () {
      let timestamp = await Crypto.timestamp()
      assert.isTrue(timestamp > Math.round(Date.now() / 1000) - 1 && timestamp < Math.round(Date.now() / 1000) + 1)
    })

    it('should get the current timestamp in b58 format', async function () {
      let timestamp = await Crypto.timestamp(true)
      assert.isTrue(timestamp.length >= 5 && timestamp.length <= 7)
    })

    it('should get a date from a b58 timestamp', async function () {
      let timestamp = Math.round(Date.now() / 1000)
      let b58timestamp = Crypto.decimalToBase58(timestamp)
      let date = await Crypto.dateFromB58(b58timestamp, true)
      assert.equal(date, (new Date(timestamp * 1000)).toISOString())
    })

    it('should generate a sha3 in b58 format', async function () {
      assert.equal(Crypto.b58Hash(password), b58Hash)
    })

  })

  describe('#AES', async function () {

    it('should encrypt and decrypt a string', async function () {
      let encrypted = Crypto.toAES(hash23456iterations, Crypto.SHA3(password))
      let decrypted = Crypto.fromAES(encrypted, Crypto.SHA3(password))
      assert.equal(hash23456iterations, decrypted)
    })

  })


})
