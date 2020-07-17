const {Crypto} = require('@secrez/core')

class Shortener {

  constructor() {
    this.urls = {}
    this.ids = {}
    this.hashes = {}
  }

  set(publicKey, url, keepShortUrl) {
    let id
    let hash = Crypto.b58Hash(publicKey + url)
    if (keepShortUrl) {
      id = this.hashes[hash]
    }
    if (!id) {
      for (; ;) {
        id = Crypto.getRandomBase32String(6)
        if (!this.ids[id]) {
          break
        }
      }
      this.ids[id] = true
      this.urls[id] = {
        publicKey,
        url
      }
      this.hashes[hash] = id
    }
    return id
  }

  get(id) {
    return this.urls[id]
  }

}

module.exports = Shortener
