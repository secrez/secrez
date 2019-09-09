const crypto = require('crypto')
const pbkdf2 = require('pbkdf2')
const {Keccak} = require('sha3')
const bs58 = require('bs58')
const {sleep} = require('.')
const Base58 = require('base58')

class Crypto {

  static decimalToBase58(dec) {
    return Base58.int_to_base58(dec)
  }

  static base58ToDecimal(b58) {
    return Base58.base58_to_int(b58)
  }

  static toBase64(data) {
    return Buffer.from(data).toString('base64')
  }

  static fromBase64(data) {
    return Buffer.from(data, 'base64').toString('utf-8')
  }

  static getRandomIv() {
    let bytes = 64 + Math.floor(Math.random() * 64)
    return Crypto.SHA3(`${crypto.randomBytes(bytes)}`).slice(0, 16)
  }

  static toAES(data, password) {
    const iv = Crypto.getRandomIv()
    let cipher = crypto.createCipheriv('aes-256-cbc', password, iv)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return [iv, encrypted].map(e => bs58.encode(e)).join('0')
  }

  static fromAES(data, password) {
    const [iv, encrypted] = data.split('0').map(e => bs58.decode(e))
    let decipher = crypto.createDecipheriv('aes-256-cbc', password, iv)
    let decrypted = decipher.update(encrypted)
    return Buffer.concat([decrypted, decipher.final()])
  }

  static SHA3(data) {
    const hash = new Keccak(256)
    hash.update(data)
    return hash.digest()
  }

  static getRandomString(length, encode) {
    return crypto.randomBytes(length).toString(encode)
  }

  static deriveKey(key, salt, iterations, size) {
    return pbkdf2.pbkdf2Sync(key, salt, iterations, size, 'sha512')
  }

  static timestamp(b58) {
    let ts = Math.round(Date.now() / 1000)
    if (b58) {
      ts = Crypto.decimalToBase58(ts)
    }
    return ts
  }

  static dateFromB58(b58) {
    let ts = Crypto.base58ToDecimal(b58)
    let d = new Date(ts * 1000)
    return d.toISOString().split('.000Z')[0]
  }

}

module.exports = Crypto
