const crypto = require('crypto')
const Crypto = require('@secrez/crypto')
const μs = require('microseconds')

Crypto.getSignPublicKeyFromSecretPublicKey = publicKey => {
  return Crypto.fromBase58(publicKey.split('0')[1])
}

Crypto.getBoxPublicKeyFromSecretPublicKey = publicKey => {
  return Crypto.fromBase58(publicKey.split('0')[0])
}

Crypto.isValidSecrezPublicKey = pk => {
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

Crypto.getTimestampWithMicroseconds = () => {
  let now = Date.now()
  let tmp = [Math.floor(now/1000), μs.parse(μs.now()).microseconds.toString()]
  tmp[1] = parseInt(now.toString().substr(- 3) + '0'.repeat(3 - tmp[1].length) + tmp[1])
  return tmp
}

Crypto.fromTsToDate = (ts) => {
  let [seconds, microseconds] = ts.split('.')
  let milliseconds = microseconds.substring(0, 3)
  let timestamp = parseInt(seconds) * 1000 + parseInt(milliseconds)
  return [(new Date(timestamp)).toISOString(), parseInt(microseconds.substring(3))]
}

//
// for retro-compatibility

// @deprecated
Crypto.toAES = (data, password) => {
  const iv = Buffer.from(crypto.randomBytes(16))
  let cipher = crypto.createCipheriv('aes-256-cbc', password, iv)
  let encrypted = cipher.update(data)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return [iv, encrypted].map(e => Crypto.bs58.encode(e)).join('0')
}

// @deprecated
Crypto.fromAES = (data, password) => {
  const [iv, encrypted] = data.split('0').map(e => Crypto.bs58.decode(e))
  let decipher = crypto.createDecipheriv('aes-256-cbc', password, iv)
  let decrypted = decipher.update(encrypted)
  return Buffer.concat([decrypted, decipher.final()])
}

module.exports = Crypto
