//
// A reduced version of @secrez/crypto to avoid cyclic dependencies
//
const basex = require('base-x')
const {Keccak} = require('sha3')

const {
  randomBytes
} = require('tweetnacl')

class Crypto0 {

  static getRandomBase58String(size) {
    let i = Math.round(size / 2)
    let j = i + size
    return Crypto0.bs58.encode(Buffer.from(randomBytes(2 * size))).substring(i, j)
  }

  static getRandomId(allIds) {
    let id
    for (; ;) {
      id = Crypto0.getRandomBase58String(4)
      if (!/^[a-zA-Z]+/.test(id)) {
        continue
      }
      if (allIds) {
        /* istanbul ignore if  */
        if (allIds[id]) {
          continue
        }
        // allIds[id] = true
      }
      return id
    }
  }

  static SHA3(data) {
    const hash = new Keccak(256)
    hash.update(data)
    return hash.digest()
  }

  static b58Hash(data, size) {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    return Crypto0.bs58.encode(Crypto0.SHA3(data)).substring(0, size)
  }


}

Crypto0.base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
Crypto0.bs58 = basex(Crypto0.base58Alphabet)

module.exports = Crypto0
