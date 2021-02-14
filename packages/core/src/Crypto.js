const crypto = require('crypto')
const μs = require('microseconds')

const SAFE_ENC = {
  '+': '-',
  '/': '_',
  '=': ''
}

const SAFE_DEC = {
  '-': '+',
  _: '/'
}

class Crypto extends require('@secrez/crypto') {

  static getSignPublicKeyFromSecretPublicKey(publicKey) {
    return Crypto.bs64.decode(publicKey.split('$')[1])
  }

  static getBoxPublicKeyFromSecretPublicKey (publicKey) {
    return Crypto.bs64.decode(publicKey.split('$')[0])
  }

  static isValidSecrezPublicKey (pk) {
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

  static getTimestampWithMicroseconds () {
    let now = Date.now()
    let tmp = [Math.floor(now / 1000), μs.parse(μs.now()).microseconds.toString()]
    tmp[1] = parseInt(now.toString().substr(-3) + '0'.repeat(3 - tmp[1].length) + tmp[1])
    return tmp
  }

  static fromTsToDate(ts) {
    let [seconds, microseconds] = ts.split('.')
    let milliseconds = microseconds.substring(0, 3)
    let timestamp = parseInt(seconds) * 1000 + parseInt(milliseconds)
    return [(new Date(timestamp)).toISOString(), parseInt(microseconds.substring(3))]
  }

  static fromBase64ToFsSafeBase64 (base64 ) {
    return base64.replace(/[+/=]/g, (m) => SAFE_ENC[m])
  }

  static fromFsSafeBase64ToBase64 (safeBase64 ) {
    for (let i = 1; i < safeBase64.length % 4; i++) safeBase64 += '='
    return safeBase64.replace(/[-_]/g, (m) => SAFE_DEC[m])
  }
}

module.exports = Crypto
