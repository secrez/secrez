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

  static getRandomId(allIds, size = 8) {
    let id
    // eslint-disable-next-line no-constant-condition
    while(true) {
      id = bs58.encode(Buffer.from(randomBytes(size)))
      if (allIds) {
        // to avoid collisions, which are anyway very unlikely
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

  static getRandomString(length = 12, encode = 'hex') {
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

  static hexToUint8Array(hexStr) {
    if (hexStr.length %2) {
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
    nonce = nonce.slice(0,6)
    let ts = Crypto.uint8ArrayToHex(nonce)
    return parseInt(ts, 16)
  }

  static generateKey(noEncode) {
    let key = randomBytes(secretbox.keyLength)
    return noEncode ? key : bs58.encode(Buffer.from(key))
  }

  static encrypt(message, key, nonce = Crypto.randomBytes(secretbox.nonceLength), getNonce) {
    const keyUint8Array = bs58.decode(key)

    const messageUint8 = decodeUTF8(message)
    const box = secretbox(messageUint8, nonce, keyUint8Array)

    const fullMessage = new Uint8Array(nonce.length + box.length)
    fullMessage.set(nonce)
    fullMessage.set(box, nonce.length)
    const encoded = bs58.encode(Buffer.from(fullMessage))

    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
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
    const encoded = bs58.encode(Buffer.from(fullMessage))

    if (getNonce) {
      return [nonce, encoded]
    } else {
      return encoded
    }
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
    const iv = Buffer.from(randomBytes(16))
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
