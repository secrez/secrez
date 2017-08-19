const _ = require('lodash')
const path = require('path')
const Crypto = require('../utils/Crypto')

class Secret {

  constructor(db) {
    this.db = db
  }

  init(options) {

    if (options.i) {
      this.fromJSON(options)
    } else {
      this.key = Crypto.getRandomString(32)
      this.salt = Crypto.getRandomString(12)
      this.name = options.name
      this.tags = options.tags
      this.createdAt = Crypto.timestamp()
      this.updatedAt = Crypto.timestamp()
      this.version = 0
      this.content = options.content
      this.modified = true
      this.id = this.db.newId()
    }
  }

  load() {
    return Promise.resolve(this.getVersionedFilename())
        .then(key => this.db.get(key))
        .then(data => {
          if (data) {
            return Promise.resolve(this.getKey())
                .then(key => Promise.resolve(Crypto.fromAES(data, key)))
                .then(content => {
                  this.fromContentJSON(content)
                  return Promise.resolve(true)
                })
          } else {
            return Promise.resolve(false)
          }
        })
  }

  fromJSON(json) {
    if (typeof json === 'string') {
      json = JSON.parse(json)
    }
    this.id = json.i
    this.name = json.n
    this.key = Crypto.fromBase64(json.k)
    this.salt = Crypto.fromBase64(json.s)
    this.tags = json.t
    this.version = json.v
    this.createdAt = json.c
    this.updatedAt = json.u
    this.content = {}
  }

  toFullJSON() {
    let s = this.toJSON()
    s.content = this.contentToJSON()
    return JSON.stringify(s)
  }

  toJSON(stringify) {
    const secret = {
      i: this.id,
      n: this.name,
      k: Crypto.toBase64(this.key),
      s: Crypto.toBase64(this.salt),
      v: this.version,
      c: this.createdAt,
      u: this.updatedAt
    }
    if (this.tags) {
      secret.t = this.tags
    }
    return stringify ? JSON.stringify(secret) : secret
  }

  cloneForEdit() {
    const clone = new Secret(this.db)
    for (var f of 'name,id,tags,version,createdAt,updatedAt'.split(',')) {
      clone[f] = this[f]
    }
    clone.content = {}
    for (let c in this.content) {
      clone.content[c] = this.content[c]
    }
    return clone
  }

  onClose() {
    delete this.id
    delete this.name
    delete this.key
    delete this.salt
    delete this.content
  }

  update(options) {
    // console.info('TRACE: Secret.update', options)
    this.name = options.name
    this.tags = options.tags
    const fields = _.invert(Secret.contentFields())
    const content = {}
    for (let f in fields) {
      if (options.content[f]) {
        if (this.content[f] !== options.content[f]) {
          this.modified = true
        }
        content[f] = options.content[f]
      } else if (this.content[f]) {
        delete this.content[f]
        this.modified = true
      }
    }
    if (this.modified) {
      this.version++
      this.updatedAt = Crypto.timestamp()
      this.content = content
    }
  }

  save() {
    // This saves only the content. The primary part is saved in the Manifest
    // console.info('TRACE: Secret.save', this)
    const content = JSON.stringify(this.contentToJSON())
    return Promise.resolve(this.getKey())
        .then(derivedKey => {
          return Promise.all([
            this.getVersionedFilename(),
            Crypto.toAES(content, derivedKey)
          ])
        })
        .then(([key, encryptedContent]) => {
          delete this.modified
          return this.db.put(key, encryptedContent)
        })
  }

  splitKey() {
    return [this.key.substring(0, 32), this.key.substring(32)]
  }

  getDerivedKey() {
    return Crypto.toSHA3(Crypto.deriveKey(this.key, this.salt, this.version + 1, 32), null)
  }

  getKey() {
    const loopedHash = this.getDerivedKey()
    const key = Crypto.toSHA3(loopedHash, this.salt, null)
    return key
  }

  getVersionedFilename() {
    const loopedHash = Crypto.toSHA3(this.getDerivedKey(), this.salt, 'base64')
    const filename = path.join(this.id, Crypto.toSHA3(loopedHash, this.salt, 'base64').replace(/\//g, '$').substring(0, 12))
    return filename
  }

  rename(name) {
    return Promise.resolve(this.name = name)
  }

  fromContentJSON(json) {
    if (typeof json === 'string') {
      json = JSON.parse(json)
    }
    const fields = Secret.contentFields()
    const content = {}
    for (let f in fields) {
      if (typeof json[f] !== 'undefined') {
        content[fields[f]] = json[f]
      }
    }
    this.content = content
  }

  contentToJSON(stringify) {
    const c = this.content
    const fields = _.invert(Secret.contentFields())
    const content = {}
    for (let f in fields) {
      if (c[f]) {
        content[fields[f]] = c[f]
      }
    }
    return stringify ? JSON.stringify(content) : content
  }

  static contentFields() {
    return {
      b: 'publicKey',
      c: 'cardData',
      e: 'email',
      f: 'fileName',
      k: 'privateKey',
      n: 'notes',
      p: 'password',
      P: 'pin',
      s: 'seed',
      u: 'url' // can be single or []
    }
  }

}

module.exports = Secret