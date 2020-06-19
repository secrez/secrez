const chai = require('chai')
const assert = chai.assert
const Crypto = require('../../src/utils/Crypto')
const utils = require('../../src/utils')
const bs58 = require('bs58')
const {sleep} = require('../helpers')

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

    it('should SHA3 a string', async function () {
      assert.isTrue(utils.secureCompare(Crypto.SHA3(password), Buffer.from(passwordSHA3Hex, 'hex')))
    })

    it('should convert from Base58 to array', async function () {
      assert.equal(Crypto.fromBase58('5Q').toString('utf8'), Buffer.from([255]))
    })

    it('should get random not base58 chars', async function () {
      assert.isTrue(Crypto.notBase58Alphabet.includes(Crypto.randomCharNotInBase58()))
    })

    it('should verify a char is over base58 chars', async function () {
      assert.isTrue(Crypto.isCharNotInBase58('Ü'))
    })

    it('should verify that the random id is random enough', async function () {

      let allIds = {}
      for (let i = 0; i <= 1e5; i++) {
        allIds[Crypto.getRandomId(allIds)] = true
      }
      for (let i = 0; i < 4; i++) {
        let chars = {}
        for (let j in allIds) {
          let c = j.substring(i, i + 1)
          if (!chars[c]) {
            chars[c] = 0
          }
          chars[c]++
        }
        let len = i ? 58 : 49
        assert.isTrue(Object.keys(chars).length === len)
        let min = 1e5
        let max = 0
        for (let k in chars) {
          min = Math.min(chars[k], min)
          max = Math.max(chars[k], max)
        }
        assert.isTrue(max / min < 1.2)
      }
    })

    it('should generate key', async function () {
      const newKey = Crypto.generateKey()
      assert.equal(bs58.decode(newKey).length, 32)
    })

    it('should convert a decimal to an uint8array', async function () {
      let ts = 1576126788489..toString(16)
      let expected = [1, 110, 248, 122, 51, 137]
      let result = Crypto.hexToUint8Array(ts)
      for (let i = 0; i < result.length; i++) {
        assert.equal(result[i], expected[i])
      }
    })

    it('should convert a uint8Array to a decimal', async function () {
      let uint8 = Uint8Array.from([1, 110, 248, 122, 51, 137])
      let hexTs = Crypto.uint8ArrayToHex(uint8)
      let expected = 1576126788489
      assert.equal(expected, parseInt(hexTs, 16))
    })

    it('should generate a new nonce', async function () {
      const nonce = Crypto.newTimeBasedNonce(secretbox.nonceLength)
      assert.equal(nonce.length, secretbox.nonceLength)
    })

    it('should retrieve the timestamp in a nonce', async function () {
      let ts = Date.now()
      const nonce = Crypto.newTimeBasedNonce(secretbox.nonceLength, ts)
      assert.equal(ts, Crypto.getTimestampFromNonce(nonce))
    })

    it('should derive a password and obtain a predeterminded hash', async function () {
      let derivedPassword = await Crypto.deriveKey(password, salt, iterations)
      assert.equal(Crypto.b58Hash(derivedPassword), hash23456iterations)
    })

    it('should generate a random string', async function () {
      let randomString = await Crypto.getRandomString()
      assert.equal(randomString.length, 24)

      randomString = await Crypto.getRandomString(4)
      assert.equal(randomString.length, 8)

      randomString = await Crypto.getRandomString(12, 'base64')
      assert.isTrue(randomString.length > 8 && randomString.length < 18)
    })

    it('should get a random base58 string', async function () {
      let rnd = Crypto.getRandomBase58String(3)
      assert.equal(rnd.length, 3)
      assert.isTrue(Crypto.base58Alphabet.indexOf(rnd[1]) !== -1)
    })

    // it('should get scrambled timestamp with pseudo-microseconds in b58 format', async function () {
    //   let ts = Date.now()
    //   let [timestamp, microseconds] = await Crypto.scrambledTimestamp()
    //   // console.log(timestamp, microseconds)
    //   for (let i=0;i<20;i++) {
    //     let original = Crypto.unscrambleTimestamp(timestamp, microseconds)
    //     assert.isTrue(parseInt(original.split('.')[0]) - Math.round(ts / 1000) <= 2)
    //     sleep(1)
    //   }
    // })

    it('should generate a sha3 in b58 format', async function () {
      assert.equal(Crypto.b58Hash(password), b58Hash)
    })

  })

  describe('#fromTsToDate', async function () {

    it('should recover a date from a timestamp with microseconds', async function () {

      for (let i = 0; i < 20; i++) {
        let ts = Crypto.getTimestampWithMicroseconds().join('.')
        let d = (new Date).toISOString().substring(0, 18)
        assert.isTrue(RegExp('^' + d).test(Crypto.fromTsToDate(ts)[0]))
        sleep(1)
      }
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
      for (let i = 0; i < nonce.length; i++) {
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
      } catch (e) {
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

  describe('#getMnemonic && #getSeed', function () {

    it('should return a random mnemonic', async function () {
      const mnemonic = Crypto.getMnemonic()
      assert.equal(mnemonic.split(' ').length, 12)
    })

    it('should return a random seed', async function () {
      const mnemonic = Crypto.getMnemonic()
      const seed = await Crypto.getSeed(mnemonic)
      assert.equal(new Uint8Array(seed).length, 64)
    })

  })

  describe('#splitSecret & #joinSecret', function () {

    it('should generate a shared secret', async function () {

      let secret = 'Some crazy secret'
      let parts = 5
      let quorum = 3

      let shared = Crypto.splitSecret(secret, parts, quorum)
      delete shared[1]
      let recovered = Crypto.joinSecret(shared)
      assert.equal(secret, recovered)

      delete shared[4]
      recovered = Crypto.joinSecret(shared)
      assert.equal(secret, recovered)

      delete shared[2]
      recovered = Crypto.joinSecret(shared)
      assert.notEqual(secret, recovered)

      secret = 'Some crazy secret'
      parts = 2
      quorum = 2

      shared = Crypto.splitSecret(secret, parts, quorum)
      recovered = Crypto.joinSecret(shared)
      assert.equal(secret, recovered)

      delete shared[1]
      recovered = Crypto.joinSecret(shared)
      assert.notEqual(secret, recovered)

      secret = Crypto.generateKey(true)
      shared = Crypto.splitSecret(secret, parts, quorum)
      recovered = Crypto.joinSecret(shared, true)
      assert.equal(secret.toString(), recovered.toString())

    })

  })

})
