const crypto = require('crypto')
const util = require('util')
const {Keccak} = require('sha3')
const basex = require('base-x')
const microtime = require('microtime')
const shamir = require('shamir')
const bip39 = require('bip39')
const blake3 = require('blake3')

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

  static toBase58(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs58.encode(data)
  }

  static toBase32(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs32.encode(data)
  }

  static fromBase64(data) {
    return Buffer.from(data, 'base64').toString('utf-8')
  }

  static fromBase58(data) {
    return Crypto.bs58.decode(data)
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

  static toBlake3(data, key) {
    return blake3.hash(data + (key ? key : ''))
  }

  static getRandomString(length = 12, encode = 'hex') {
    return crypto.randomBytes(length).toString(encode)
  }

  static deriveKey(key, salt, iterations, size = 32, digest = 'sha512') {
    return crypto.pbkdf2Sync(key, salt, iterations, size, digest)
  }

  static getTimestampWithMicroseconds() {
    let tmp = microtime.nowDouble().toString().split('.')
    for (; ;) {
      if (tmp[1].length === 6) {
        break
      }
      tmp[1] += '0'
    }
    tmp = tmp.map(e => parseInt(e))
    return tmp
  }

  static fromTsToDate(ts) {
    let [seconds, microseconds] = ts.split('.')
    let milliseconds = microseconds.substring(0, 3)
    let timestamp = parseInt(seconds) * 1000 + parseInt(milliseconds)
    return [(new Date(timestamp)).toISOString(), parseInt(microseconds.substring(3))]
  }

  static b58Hash(data, size) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto.bs58.encode(Crypto.SHA3(data)).substring(0, size)
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

  static generateKey(noEncode) {
    let key = randomBytes(secretbox.keyLength)
    return noEncode ? key : Crypto.bs58.encode(Buffer.from(key))
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

  static encrypt(message, key, nonce = Crypto.randomBytes(secretbox.nonceLength), getNonce) {
    const keyUint8Array = Crypto.bs58.decode(key)

    const messageUint8 = decodeUTF8(message)
    const box = secretbox(messageUint8, nonce, keyUint8Array)

    const fullMessage = new Uint8Array(nonce.length + box.length)
    fullMessage.set(nonce)
    fullMessage.set(box, nonce.length)
    const encoded = Crypto.bs58.encode(Buffer.from(fullMessage))

    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
  }

  static decrypt(messageWithNonce, key) {
    const keyUint8Array = Crypto.bs58.decode(key)
    const messageWithNonceAsUint8Array = Crypto.bs58.decode(messageWithNonce)
    const nonce = messageWithNonceAsUint8Array.slice(0, secretbox.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
        secretbox.nonceLength,
        messageWithNonce.length
    )
    const decrypted = secretbox.open(message, nonce, keyUint8Array)
    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }
    return encodeUTF8(decrypted)
  }

  static getNonceFromMessage(messageWithNonce) {
    const messageWithNonceAsUint8Array = Crypto.bs58.decode(messageWithNonce)
    let nonce = messageWithNonceAsUint8Array.slice(0, secretbox.nonceLength)
    return Crypto.hexToUint8Array(nonce.toString('hex'))
  }

  static generateBoxKeyPair(noEncode) {
    const pair = box.keyPair()
    return pair
  }

  static generateSignatureKeyPair(noEncode) {
    const pair = sign.keyPair()
    return pair
  }

  static isValidPublicKey(pk) {
    if (pk instanceof Uint8Array) {
      return pk.length === box.publicKeyLength
    }
    return false
  }

  static getSharedSecret(theirPublicKey, mySecretKey) {
    return box.before(theirPublicKey, mySecretKey)
  }

  static boxEncrypt(secretOrSharedKey, message, key, nonce = randomBytes(box.nonceLength), getNonce) {
    const messageUint8 = decodeUTF8(message)
    const encrypted = key
        ? box(messageUint8, nonce, key, secretOrSharedKey)
        : box.after(messageUint8, nonce, secretOrSharedKey)

    const fullMessage = new Uint8Array(nonce.length + encrypted.length)
    fullMessage.set(nonce)
    fullMessage.set(encrypted, nonce.length)
    const encoded = Crypto.bs58.encode(Buffer.from(fullMessage))

    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
  }

  static boxDecrypt(secretOrSharedKey, messageWithNonce, key) {
    const messageWithNonceAsUint8Array = Crypto.bs58.decode(messageWithNonce)
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

  static getSignature(message, secretKey) {
    let signature = sign.detached(decodeUTF8(message), secretKey)
    return Crypto.bs58.encode(Buffer.from(signature))
  }

  static verifySignature(message, signature, publicKey) {
    let verified = sign.detached.verify(decodeUTF8(message), Crypto.bs58.decode(signature), publicKey)
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
    return asUint8Array ? recovered : utf8Decoder.decode(recovered)
  }

  static getSignPublicKeyFromSecretPublicKey(publicKey) {
    return Crypto.fromBase58(publicKey.split('0')[1])
  }

  static getBoxPublicKeyFromSecretPublicKey(publicKey) {
    return Crypto.fromBase58(publicKey.split('0')[0])
  }

  static isValidSecrezPublicKey(pk) {
    if (typeof pk === 'string') {
      const [boxPublicKey, signPublicKey] = pk.split('0').map(e => {
        e = Crypto.fromBase58(e)
        if (Crypto.isValidPublicKey(e)) {
          return e
        }
      })
      if (boxPublicKey && signPublicKey) {
        return true
      }
    }
    return false
  }

  //
  // for retro-compatibility

  // @deprecated
  static toAES(data, password) {
    const iv = Buffer.from(randomBytes(16))
    let cipher = crypto.createCipheriv('aes-256-cbc', password, iv)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return [iv, encrypted].map(e => Crypto.bs58.encode(e)).join('0')
  }

  // @deprecated
  static fromAES(data, password) {
    const [iv, encrypted] = data.split('0').map(e => Crypto.bs58.decode(e))
    let decipher = crypto.createDecipheriv('aes-256-cbc', password, iv)
    let decrypted = decipher.update(encrypted)
    return Buffer.concat([decrypted, decipher.final()])
  }

}

Crypto.base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
Crypto.bs58 = basex(Crypto.base58Alphabet)

Crypto.zBase32Alphabet = 'ybndrfg8ejkmcpqxot1uwisza345h769'
Crypto.bs32 = basex(Crypto.zBase32Alphabet)

Crypto.randomBytes = randomBytes

module.exports = Crypto
