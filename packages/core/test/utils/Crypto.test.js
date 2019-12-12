const chai = require('chai')
const assert = chai.assert
const Crypto = require('../../src/utils/Crypto')
const utils = require('../../src/utils')
const bs58 = require('bs58')

const {
  box,
  secretbox,
  randomBytes
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

    it('should SHA3 a string', async function () {
      assert.isTrue(utils.secureCompare(Crypto.SHA3(password), Buffer.from(passwordSHA3Hex, 'hex')))
    })

    it('should convert from Base58 to array', async function () {
      assert.equal(Crypto.fromBase58('5Q').toString('utf8'), Buffer.from([255]))
    })



    it('should generate a random id skipping existing one', async function () {
      let allIds = {}
      for (let i=0; i <= 250;i++) {
        allIds[bs58.encode(Buffer.from([i]))] = true
      }
      let remainder = ['5L','5M','5N','5P','5Q']
      assert.isTrue(remainder.includes(Crypto.getRandomId(allIds, 1)))

    })

    it('should generate key', async function () {
      const newKey = Crypto.generateKey()
      assert.equal(bs58.decode(newKey).length, 32)
    })

    it('should convert a decimal to an uint8array', async function () {
      let ts = 1576126788489..toString(16)
      let expected = [ 22, 239, 135, 163, 56, 9]
      let result = Crypto.hexToUint8Array(ts)
      for (let i=0;i<result.length;i++) {
        assert.equal(result[i], expected[i])
      }
    })

    it('should convert a uint8Array to a decimal', async function () {
      let uint8 = Uint8Array.from([ 22, 239, 135, 163, 56, 9])
      let hexTs = Crypto.uint8ArrayToHex(uint8)
      let expected = 1576126788489
      assert.equal(expected, parseInt(hexTs, 16))
    })

    it('should generate a new nonce', async function () {
      const nonce = Crypto.newTimeBasedNonce(secretbox.nonceLength)
      assert.equal(nonce.length, secretbox.nonceLength)
    })

    it.only('should retrieve the timestamp in a nonce', async function () {
      let ts = Date.now()
      console.log(ts)
      const nonce = Crypto.newTimeBasedNonce(secretbox.nonceLength, ts)
      assert.equal(ts, Crypto.getTimestampFromNonce(nonce))
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


  describe('#encrypt/decrypt', async function () {

    it('should encrypt and decrypt a string', async function () {
      const key = Crypto.generateKey()

      let [nonce, encrypted] = Crypto.encrypt(hash23456iterations, key, undefined, true)
      assert.equal(nonce.length, 24)
      let decrypted = Crypto.decrypt(encrypted, key)
      assert.equal(hash23456iterations, decrypted)
    })

    it('should get the nonce of an encrypted string', async function () {
      const key = Crypto.generateKey()
      let [nonce, encrypted] = Crypto.encrypt(hash23456iterations, key, undefined, true)
      assert.equal(nonce.length, 24)
      let recoveredNonce = Crypto.getNonceFromMessage(encrypted)
      for (let i=0;i<nonce.length;i++) {
        assert.equal(nonce[i], recoveredNonce[i])
      }
    })
  })

  describe('encrypt/decrypt using sharedSecret', function () {

    let pairA = Crypto.generateBoxKeyPair()
    let pairB = Crypto.generateBoxKeyPair()
    let sharedA = Crypto.getSharedSecret(pairB.publicKey, pairA.secretKey)
    let sharedB = Crypto.getSharedSecret(pairA.publicKey, pairB.secretKey)

    it('should encrypt and decrypt using keys combination', async function () {
      const msg = 'Some message'
      const [nonce, encrypted] = Crypto.boxEncrypt(sharedA, msg, undefined, undefined, true)
      const decrypted = Crypto.boxDecrypt(sharedB, encrypted)
      assert.equal(msg, decrypted)
      assert.equal(nonce.length, box.nonceLength)
    })

    it('should encrypt and decrypt using keys combination plus shared key', async function () {
      const key = Crypto.generateKey(true)
      const msg = 'Some message'
      const encrypted = Crypto.boxEncrypt(sharedA, msg, key)
      const decrypted = Crypto.boxDecrypt(sharedB, encrypted, key)
      assert.equal(msg, decrypted)

    })

    it('should throw if the encrypted data is wrong', async function () {
      const key = Crypto.generateKey(true)
      const msg = 'Some message'
      try {
        let encrypted = Crypto.boxEncrypt(sharedA, msg, key) + '5F'
        Crypto.boxDecrypt(sharedB, encrypted, key)
        assert.equal(true, 'Should throw')
      } catch(e) {
        assert.equal(e.message, 'Could not decrypt message')
      }
    })

  })

  describe('sign a message with a secretKey', function () {

    let pair = Crypto.generateSignatureKeyPair()

    it('should sign a string', async function () {
      const msg = 'Some message'
      const signature = Crypto.getSignature(msg, pair.secretKey)
      const verified = Crypto.verifySignature(msg, signature, pair.publicKey)
      assert.isTrue(verified)

    })



  })


})
