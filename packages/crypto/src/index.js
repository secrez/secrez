const crypto = require('crypto')
const util = require('util')
const {Keccak} = require('sha3')
const basex = require('base-x')
const shamir = require('shamir')
const bip39 = require('bip39')
const {bytesToBase64, base64ToBytes} = require('byte-base64')
const { encode: urlSafeEncode, decode: urlSafeDecode} = require('url-safe-base64')

const {
  box,
  secretbox,
  sign,
  randomBytes
} = require('tweetnacl')

const {
  decodeUTF8,
  encodeUTF8
} = require('tweetnacl-util')

class Crypto {

  static toBase64(data) {
    return Buffer.from(data).toString('base64')
  }

  static fromBase64(data) {
    return Buffer.from(data, 'base64').toString('utf-8')
  }

  static fromBase64ToUrlSafeBase64(data) {
    return urlSafeEncode(data)
  }

  static fromUrlSafeBase64ToBase64(data) {
    return urlSafeDecode(data)
  }

  static toBase58(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs58.encode(data)
  }

  static fromBase58(data) {
    return Crypto.bs58.decode(data)
  }

  static toBase32(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs32.encode(data)
  }

  static fromBase32(data) {
    return Crypto.bs32.decode(data)
  }

  static getRandomBase58String(size) {
    let i = Math.round(size / 2)
    let j = i + size
    return Crypto.bs58.encode(Buffer.from(randomBytes(2 * size))).substring(i, j)
  }

  static getRandomBase32String(size) {
    let i = Math.round(size / 2)
    let j = i + size
    return Crypto.bs32.encode(Buffer.from(randomBytes(2 * size))).substring(i, j)
  }

  static getRandomId(allIds) {
    let id
    for (; ;) {
      id = Crypto.getRandomBase58String(4)
      if (!/^[a-zA-Z]+/.test(id)) {
        continue
      }
      if (allIds) {
        /* istanbul ignore if  */
        if (allIds[id]) {
          continue
        }
        // allIds[id] = true
      }
      return id
    }
  }

  static getMnemonic() {
    return bip39.entropyToMnemonic(crypto.randomBytes(16).toString('hex'))
  }

  static async getSeed(recoveryCode) {
    return await bip39.mnemonicToSeed(recoveryCode)
  }

  static SHA3(data) {
    const hash = new Keccak(256)
    hash.update(data)
    return hash.digest()
  }

  static getRandomString(length = 12, encode = 'hex') {
    return crypto.randomBytes(length).toString(encode)
  }

  static deriveKey(key, salt, iterations, size = 32, digest = 'sha512') {
    return crypto.pbkdf2Sync(key, salt, iterations, size, digest)
  }

  static b58Hash(data, size) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs58.encode(Crypto.SHA3(data)).substring(0, size)
  }

  static b64Hash(data, size) {
    return Crypto.bs64.encode(Crypto.SHA3(data)).substring(0, size)
  }

  static b32Hash(data, size) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs32.encode(Crypto.SHA3(data)).substring(0, size)
  }

  static isValidB58Hash(hash) {
    return Crypto.bs58.decode(hash).length === 32
  }

  static isValidB32Hash(hash) {
    return Crypto.bs32.decode(hash).length === 32
  }

  static hexToUint8Array(hexStr) {
    if (hexStr.length % 2) {
      hexStr = '0' + hexStr
    }
    return new Uint8Array(hexStr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }

  static uint8ArrayToHex(uint8) {
    return Buffer.from(uint8).toString('hex')
  }

  static newTimeBasedNonce(size, timestamp = Date.now()) {
    let nonce = randomBytes(size)
    timestamp = timestamp.toString(16)
    let ts = Crypto.hexToUint8Array(timestamp)
    for (let i = 0; i < 6; i++) {
      nonce[i] = ts[i]
    }
    return nonce
  }

  static getTimestampFromNonce(nonce) {
    nonce = nonce.slice(0, 6)
    let ts = Crypto.uint8ArrayToHex(nonce)
    return parseInt(ts, 16)
  }

  static generateKey(noEncode, codec = 'bs64') {
    let key = randomBytes(secretbox.keyLength)
    if (codec === 'bs58') {
      key = Buffer.from(key)
    }
    return noEncode ? key : Crypto[codec].encode(key)
  }

  static isBase58String(str) {
    let re = RegExp(`[^${Crypto.base58Alphabet}]+`)
    return !re.test(str)
  }

  static isBase32String(str) {
    let re = RegExp(`[^${Crypto.zBase32Alphabet}]+`)
    return !re.test(str)
  }

  static isUint8Array(key) {
    return typeof key === 'object' && key.constructor === Uint8Array
  }

  static encrypt(message, key, nonce = Crypto.randomBytes(secretbox.nonceLength), getNonce, returnUint8Array, codec = 'bs64') {
    let messageUint8 = Buffer.isBuffer(message) ? new Uint8Array(message) : typeof message === 'string' ? decodeUTF8(message) : message
    const keyUint8Array = typeof key === 'string' ? Crypto[codec].decode(key) : key
    const box = secretbox(messageUint8, nonce, keyUint8Array)
    let fullMessage = new Uint8Array(nonce.length + box.length)
    fullMessage.set(nonce)
    fullMessage.set(box, nonce.length)
    if (codec === 'bs58') {
      fullMessage = Buffer.from(fullMessage)
    }
    const encoded = returnUint8Array ? fullMessage : Crypto[codec].encode(fullMessage)
    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
  }

  static decrypt(messageWithNonce, key, returnUint8Array, codec = 'bs64') {
    const messageWithNonceAsUint8Array = typeof messageWithNonce === 'string' ? Crypto[codec].decode(messageWithNonce) : messageWithNonce
    const keyUint8Array = typeof key === 'string' ? Crypto[codec].decode(key) : key
    const nonce = messageWithNonceAsUint8Array.slice(
        0,
        secretbox.nonceLength
    )
    const message = messageWithNonceAsUint8Array.slice(
        secretbox.nonceLength,
        messageWithNonceAsUint8Array.length
    )
    const decrypted = secretbox.open(message, nonce, keyUint8Array)
    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }
    return returnUint8Array ? decrypted : encodeUTF8(decrypted)
  }


  static getNonceFromMessage(messageWithNonce, codec = 'bs64') {
    return Crypto[codec].decode(messageWithNonce).slice(0, secretbox.nonceLength)
  }

  static generateBoxKeyPair(noEncode) {
    const pair = box.keyPair()
    return pair
  }

  static seedFromPassphrase(passphrase) {
    if (typeof passphrase === 'string' && passphrase.length > 0) {
      return Uint8Array.from(Crypto.SHA3(passphrase))
    } else {
      throw new Error('Not a valid string')
    }
  }

  static generateSignatureKeyPair(seed) {
    let pair
    if (seed) {
      pair = sign.keyPair.fromSeed(seed)
    } else {
      pair = sign.keyPair()
    }
    return pair
  }

  static isValidPublicKey(key) {
    if (key instanceof Uint8Array) {
      return key.length === 32
    } else {
      return false
    }
  }

  static isValidSecretKey(key) {
    if (key instanceof Uint8Array) {
      return key.length === 64
    } else {
      return false
    }
  }

  static getSharedSecret(theirPublicKey, mySecretKey) {
    return box.before(theirPublicKey, mySecretKey)
  }

  static boxEncrypt(secretOrSharedKey, message, key, nonce = randomBytes(box.nonceLength), getNonce, codec = 'bs64') {
    const messageUint8 = decodeUTF8(message)
    const encrypted = key
        ? box(messageUint8, nonce, key, secretOrSharedKey)
        : box.after(messageUint8, nonce, secretOrSharedKey)

    let fullMessage = new Uint8Array(nonce.length + encrypted.length)
    fullMessage.set(nonce)
    fullMessage.set(encrypted, nonce.length)
    if (codec === 'bs58') {
      fullMessage = Buffer.from(fullMessage)
    }
    const encoded = Crypto[codec].encode(fullMessage)
    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
  }

  static boxDecrypt(secretOrSharedKey, messageWithNonce, key, codec = 'bs64') {
    const messageWithNonceAsUint8Array = Crypto[codec].decode(messageWithNonce)
    const nonce = messageWithNonceAsUint8Array.slice(0, box.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
        box.nonceLength,
        messageWithNonce.length
    )
    const decrypted = key
        ? box.open(message, nonce, key, secretOrSharedKey)
        : box.open.after(message, nonce, secretOrSharedKey)

    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }
    return encodeUTF8(decrypted)
  }

  static getSignature(message, secretKey, codec = 'bs64') {
    let signature = sign.detached(decodeUTF8(message), secretKey)
    if (codec === 'bs58') {
      signature = Buffer.from(signature)
    }
    return Crypto[codec].encode(signature)
  }

  static verifySignature(message, signature, publicKey, codec = 'bs64') {
    let verified = sign.detached.verify(decodeUTF8(message), Crypto[codec].decode(signature), publicKey)
    return verified
  }

  static splitSecret(secretBytes, parts, quorum) {
    if (!Crypto.isUint8Array(secretBytes)) {
      const utf8Encoder = new util.TextEncoder()
      secretBytes = utf8Encoder.encode(secretBytes)
    }
    return shamir.split(Crypto.randomBytes, parts, quorum, secretBytes)
  }

  static joinSecret(parts, asUint8Array) {
    const utf8Decoder = new util.TextDecoder()
    const recovered = shamir.join(parts)
    return asUint8Array ? recovered : Buffer.from(recovered).toString('utf8')
  }

}

Crypto.base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
Crypto.bs58 = basex(Crypto.base58Alphabet)

Crypto.zBase32Alphabet = 'ybndrfg8ejkmcpqxot1uwisza345h769'
Crypto.bs32 = basex(Crypto.zBase32Alphabet)

Crypto.bs64 = {

  encode: data => {
    return bytesToBase64(data)
  },

  decode: data => {
    return base64ToBytes(data)
  }
}

Crypto.randomBytes = randomBytes

module.exports = Crypto
