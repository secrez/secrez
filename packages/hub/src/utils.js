const Crypto = require('@secrez/crypto')
const validator = require('./Validator')
const Db = require('./lib/Db')
let db

const Utils = {

  async initDb(reset) {
    db = new Db()
    await db.init(reset)
  },

  async resetDb() {
    await Utils.initDb(true)
  },

  newId() {
    return Db.newId()
  },

  async getRandomId(publickey, reset) {
    let result = await db.knex.select('*').from('tunnels').where({publickey})
    let extId
    if (result && result[0]) {
      extId = result[0].id
    }
    if (extId && !reset) {
      return extId
    }
    let id
    for (; ;) {
      id = Db.newId()
      result = await db.knex.select('*').from('tunnels').where({id})
      if (result && result[0]) {
        continue
      } else {
        break
      }
    }
    if (extId && reset) {
      await db.knex('tunnels').update({id}).where({publickey})
    } else {
      await db.knex.insert({publickey, id}).into('tunnels')
    }
    return id
  },

  isValidUrl(url) {
    return !!Utils.getClientIdFromHostname(url)
  },

  async isValidRandomId(id, publickey) {
    try {
      if (Db.isValidId(id)) {
        if (publickey) {
          let result = await db.knex.select('*').from('tunnels').where({id})
          if (result && result[0]) {
            return publickey === result[0].publickey
          }
        } else {
          return true
        }
      }
    } catch (e) {
    }
    return false
  },

  async getPublicKeyFromId(id) {
    let result = await db.knex.select('*').from('tunnels').where({id})
    if (result && result[0]) {
      return result[0].publickey
    }
  },

  verifyPayload(payload, signature, validFor, onlyOneTime) {
    let {when, publicKey} = JSON.parse(payload)
    let signPublicKey = Crypto.getSignPublicKeyFromSecretPublicKey(publicKey)
    let verified = Crypto.verifySignature(payload, signature, signPublicKey)
    if (verified && validFor && Math.abs(Date.now() - when) > validFor) {
      verified = false
    }
    if (verified && onlyOneTime) {
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
        if (Db.isValidId(part)) {
          return part
        }
      }
    } catch (e) {
    }
    return false
  }
}


module.exports = Utils
