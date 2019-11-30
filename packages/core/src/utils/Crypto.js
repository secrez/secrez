const crypto = require('crypto')
const {Keccak} = require('sha3')
const bs58 = require('bs58')
const utils = require('.')
const {
  box,
  secretbox,
  sign,
  randomBytes
} = require('tweetnacl')
const nacl = require('tweetnacl')

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
    return bs58.encode(data)
  }

  static fromBase64(data) {
    return Buffer.from(data, 'base64').toString('utf-8')
  }

  static fromBase58(data) {
    return bs58.decode(data)
  }

  static getRandomIv() {
    return Crypto.SHA3(`${crypto.randomBytes(64)}`).slice(0, 16)
  }

  static getRandomId(allIds) {
    let id
    // eslint-disable-next-line no-constant-condition
    while(true) {
      id = bs58.encode(Crypto.getRandomIv())
      if (allIds) { // to avoid collisions, which are anyway very unlikely
        if (allIds[id]) {
          continue
        }
        allIds[id] = true
      }
      return id
    }
  }

  static SHA3(data) {
    const hash = new Keccak(256)
    hash.update(data)
    return hash.digest()
  }

  static getRandomString(length, encode) {
    return crypto.randomBytes(length).toString(encode)
  }

  static deriveKey(key, salt, iterations, size = 32, digest = 'sha512') {
    return crypto.pbkdf2Sync(key, salt, iterations, size, digest)
  }

  static timestamp(b58) {
    let ts = Math.round(Date.now() / 1000)
    if (b58) {
      ts = utils.intToBase58(ts)
    }
    return ts
  }

  static dateFromB58(b58, full) {
    let ts = utils.base58ToInt(b58)
    let d = (new Date(ts * 1000)).toISOString()
    return full ? d : d.split('.000Z')[0]
  }

  static b58Hash(data) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return bs58.encode(Crypto.SHA3(data))
  }

  static toUint8Array(hexStr) {
    return new Uint8Array(hexStr.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }

  static newTimeBasedNonce(size, noTimestamp) {
    let nonce = randomBytes(size)
    if (!noTimestamp) {
      let ts = Crypto.toUint8Array(Date.now().toString(16))
      for (let i = 0; i < 6; i++) {
        nonce[i] = ts[i]
      }
    }
    return nonce
  }

  static generateKey(noEncode) {
    let key = randomBytes(secretbox.keyLength)
    return noEncode ? key : bs58.encode(Buffer.from(key))
  }

  static encrypt(message, key, nonce = Crypto.newTimeBasedNonce(secretbox.nonceLength)) {
    const keyUint8Array = bs58.decode(key)

    const messageUint8 = decodeUTF8(message)
    const box = secretbox(messageUint8, nonce, keyUint8Array)

    const fullMessage = new Uint8Array(nonce.length + box.length)
    fullMessage.set(nonce)
    fullMessage.set(box, nonce.length)

    return bs58.encode(Buffer.from(fullMessage))
  }

  static decrypt(messageWithNonce, key) {
    const keyUint8Array = bs58.decode(key)
    const messageWithNonceAsUint8Array = bs58.decode(messageWithNonce)
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
    const messageWithNonceAsUint8Array = bs58.decode(messageWithNonce)
    return messageWithNonceAsUint8Array.slice(0, secretbox.nonceLength)
  }

  static generateBoxKeyPair(noEncode) {
    const pair = box.keyPair()
    return pair
  }

  static generateSignatureKeyPair(noEncode) {
    const pair = sign.keyPair()
    return pair
  }

  static getSharedSecret(theirPublicKey, mySecretKey) {
    return box.before(theirPublicKey, mySecretKey)
  }

  static boxEncrypt(secretOrSharedKey, message, key, nonce = randomBytes(box.nonceLength)) {
    const messageUint8 = decodeUTF8(message)
    const encrypted = key
        ? box(messageUint8, nonce, key, secretOrSharedKey)
        : box.after(messageUint8, nonce, secretOrSharedKey)

    const fullMessage = new Uint8Array(nonce.length + encrypted.length)
    fullMessage.set(nonce)
    fullMessage.set(encrypted, nonce.length)
    return bs58.encode(Buffer.from(fullMessage))
  }

  static boxDecrypt(secretOrSharedKey, messageWithNonce, key) {
    const messageWithNonceAsUint8Array = bs58.decode(messageWithNonce)
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
    return bs58.encode(Buffer.from(signature))
  }

  static verifySignature(message, signature, publicKey) {
    let verified = sign.detached.verify(decodeUTF8(message), bs58.decode(signature), publicKey)
    return verified
  }

  //
  // for retro-compatibility

  // @deprecated
  static toAES(data, password) {
    const iv = Crypto.getRandomIv()
    let cipher = crypto.createCipheriv('aes-256-cbc', password, iv)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return [iv, encrypted].map(e => bs58.encode(e)).join('0')
  }

  // @deprecated
  static fromAES(data, password) {
    const [iv, encrypted] = data.split('0').map(e => bs58.decode(e))
    let decipher = crypto.createDecipheriv('aes-256-cbc', password, iv)
    let decrypted = decipher.update(encrypted)
    return Buffer.concat([decrypted, decipher.final()])
  }

}

module.exports = Crypto
