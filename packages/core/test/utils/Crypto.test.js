const chai = require('chai')
const assert = chai.assert
const Crypto = require('../../src/utils/Crypto')
const utils = require('../../src/utils')
const bs58 = require('bs58')

const {
  box,
  secretbox
} = require('tweetnacl')


const {
  password,
  b58Hash,
  passwordSHA3Hex,
  passwordB64,
  salt,
  iterations,
  hash23456iterations
} = require('../fixtures')

describe('#Crypto', function () {


  describe('#utils', async function () {

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
      assert.isTrue(utils.secureCompare(Crypto.SHA3(password), Buffer.from(passwordSHA3Hex, 'hex')))
    })

    it('should generate key', async function () {
      const newKey = Crypto.generateKey()
      assert.equal(bs58.decode(newKey).length, 32)
    })

    it('should generate a new nounce', async function () {
      const nonce = Crypto.newNonce(secretbox.nonceLength)
      assert.equal(nonce.length, 24)
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
      let b58timestamp = utils.intToBase58(timestamp)
      let date = await Crypto.dateFromB58(b58timestamp, true)
      assert.equal(date, (new Date(timestamp * 1000)).toISOString())
      date = await Crypto.dateFromB58(b58timestamp)
      assert.equal(date + '.000Z', (new Date(timestamp * 1000)).toISOString())

    })

    it('should generate a sha3 in b58 format', async function () {
      assert.equal(Crypto.b58Hash(password), b58Hash)
    })

  })

  describe('#toAES/fromAES', async function () {

    it('should encrypt and decrypt a string', async function () {
      const key = Crypto.generateKey(true)
      let encrypted = Crypto.toAES(hash23456iterations, key)
      let decrypted = Crypto.fromAES(encrypted, key)
      assert.equal(hash23456iterations, decrypted)
    })

  })


  describe('#AES', async function () {

    it('should encrypt and decrypt a string', async function () {
      const key = Crypto.generateKey()
      let encrypted = Crypto.encrypt(hash23456iterations, key)
      let decrypted = Crypto.decrypt(encrypted, key)
      assert.equal(hash23456iterations, decrypted)
    })

  })

  describe('encrypt/decrypt using sharedSecret', function () {

    let pairA = Crypto.generateKeyPair()
    let pairB = Crypto.generateKeyPair()
    let sharedA = Crypto.getSharedSecret(pairB.publicKey, pairA.secretKey)
    let sharedB = Crypto.getSharedSecret(pairA.publicKey, pairB.secretKey)

    it('should encrypt and decrypt using keys combination', async function () {
      const msg = 'Some message'
      const encrypted = Crypto.boxEncrypt(sharedA, msg)
      const decrypted = Crypto.boxDecrypt(sharedB, encrypted)
      assert.equal(msg, decrypted)

    })

    it('should encrypt and decrypt using keys combination plus shared key', async function () {
      const key = Crypto.generateKey(true)
      const msg = 'Some message'
      const encrypted = Crypto.boxEncrypt(sharedA, msg, key)
      const decrypted = Crypto.boxDecrypt(sharedB, encrypted, key)
      assert.equal(msg, decrypted)

    })

  })


})
