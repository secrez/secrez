const {Crypto} = require('@secrez/core')
const validator = require('./Validator')

const Utils = {

  getRandomId(publicKey, allIds = {}) {
    let id
    let prefix = Crypto.b32Hash(Crypto.getSignPublicKeyFromSecretPublicKey(publicKey))
    for (; ;) {
      id = [prefix, Crypto.getRandomBase32String(8)].join('0')
      if (allIds[id]) {
        continue
      }
      return id
    }
  },

  isValidUrl(url, publicKey) {
    let id = Utils.getClientIdFromHostname(url)
    if (id) {
      return Utils.isValidRandomId(id, publicKey)
    }
    return false
  },

  isValidRandomId(id = '', publicKey) {
    id = id.split('0')
    return (
        Crypto.isBase32String(id[0]) &&
        id[1] &&
        id[1].length === 8 &&
        Crypto.isBase32String(id[1]) && (
            publicKey
                ? Crypto.b32Hash(Crypto.getSignPublicKeyFromSecretPublicKey(publicKey)) === id[0]
                : Crypto.fromBase32(id[0]).length === 32
        )
    )
  },

  shortId(id) {
    if (typeof id !== 'string' || !id.length) {
      return ''
    }
    id = id.split('0')
    return id[0].substring(0, 4) + (id[1] ? '...' + id[1] : '')
  },

  verifyPayload(payload, signature, validFor, onlyOneTime) {
    let {when, publicKey} = JSON.parse(payload)
    let signPublicKey = Crypto.getSignPublicKeyFromSecretPublicKey(publicKey)
    let verified = Crypto.verifySignature(payload, signature, signPublicKey)
    if (verified && validFor && Math.abs(Date.now() - when) > validFor) {
      verified = false
    }
    if (verified && onlyOneTime) {
      // it can be verified only one time
      let key = when + signature
      if (validator.isAlreadyValidated(when, signature)) {
        verified = false
      } else {
        validator.setAsValidated(when, signature)
      }
    }
    return verified
  },

  setPayloadAndSignIt(secrez, payload) {
    const publicKey = secrez.getPublicKey()
    payload = Object.assign(payload, {
      when: Date.now(),
      publicKey,
      salt: Crypto.getRandomBase58String(16)
    })
    payload = JSON.stringify(payload)
    const signature = secrez.signMessage(payload)
    return {payload, signature}
  },

  getClientIdFromHostname(hostname = '') {
    try {
      hostname = hostname.replace(/^[^/]+\/\//, '')
      hostname = hostname.toString().split('.')
      for (let part of hostname) {
        if (Utils.isValidRandomId(part)) {
          return part
        }
      }
    } catch(e) {
    }
  }
}


module.exports = Utils
