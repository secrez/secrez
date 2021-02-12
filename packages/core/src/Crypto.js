const crypto = require('crypto')
const Crypto = require('@secrez/crypto')
const μs = require('microseconds')

Crypto.getSignPublicKeyFromSecretPublicKey = publicKey => {
  return Crypto.bs64.decode(publicKey.split('$')[1])
}

Crypto.getBoxPublicKeyFromSecretPublicKey = publicKey => {
  return Crypto.bs64.decode(publicKey.split('$')[0])
}

Crypto.isValidSecrezPublicKey = pk => {
  if (typeof pk === 'string') {
    try {
      const [boxPublicKey, signPublicKey] = pk.split('$').map(e => {
        e = Crypto.bs64.decode(e)
        if (Crypto.isValidPublicKey(e)) {
          return e
        }
      })
      if (boxPublicKey && signPublicKey) {
        return true
      }
    } catch (e) {
    }
  }
  return false
}

Crypto.getTimestampWithMicroseconds = () => {
  let now = Date.now()
  let tmp = [Math.floor(now / 1000), μs.parse(μs.now()).microseconds.toString()]
  tmp[1] = parseInt(now.toString().substr(-3) + '0'.repeat(3 - tmp[1].length) + tmp[1])
  return tmp
}

Crypto.fromTsToDate = (ts) => {
  let [seconds, microseconds] = ts.split('.')
  let milliseconds = microseconds.substring(0, 3)
  let timestamp = parseInt(seconds) * 1000 + parseInt(milliseconds)
  return [(new Date(timestamp)).toISOString(), parseInt(microseconds.substring(3))]
}

module.exports = Crypto
