const {Crypto} = require('@secrez/core')

module.exports = {

  getRandomId(publicKey, allIds = {}) {
    let id
    let prefix = Crypto.b32Hash(publicKey)
    for (; ;) {
      id = [prefix, Crypto.getRandomBase32String(4)].join('0')
      if (allIds[id]) {
        continue
      }
      return id
    }
  },

  isValidRandomId(id, publicKey) {
    id = id.split('0')
    return Crypto.isBase32String(id[0]) && Crypto.isBase32String(id[1]) && id[0] === Crypto.b32Hash(publicKey)
  }
}
