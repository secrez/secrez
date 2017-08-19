const crypto = require('crypto')
const pbkdf2 = require('pbkdf2')
const SHA3 = require('sha3')

class Crypto {

  static toBase64(data) {
    const str = new Buffer(data).toString('base64')
    return str
  }

  static fromBase64(data) {
    const str = new Buffer(data, 'base64').toString('utf-8')
    return str
  }

  static fromAES(encrypted, password, bit = 256) {
    const decipher = crypto.createDecipher('aes' + bit, password)
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  static toAES(data, password, bit = 256) {
    const cipher = crypto.createCipher('aes' + bit, password)
    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    return encrypted
  }

  static toSHA3(data, encode) {
    const d = new SHA3.SHA3Hash()
    d.update(data)
    const hash = d.digest(encode)
    return hash
  }

  static getRandomString(length, encode) {
    const buf = crypto.randomBytes(length)
    return buf.toString(encode)
  }

  static deriveKey(key, salt, iterations = 500000, size = 32) {
    const derivedKey = pbkdf2.pbkdf2Sync(key, salt, iterations, size, 'sha512')
    return derivedKey
  }

  static timestamp() {
    return (Date.now() / 1000) | 1
  }

}

module.exports = Crypto