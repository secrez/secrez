const {DataCache} = require('@secrez/fs')

let cache = new DataCache

class PublicKeyManager {

  static setCache(dataCache) {
    if (typeof dataCache === 'object') {
      cache = dataCache
    }
  }

  static getCache() {
    return cache
  }

  get(publickey) {
    return cache.get('publickey', publickey)
  }

  async put(options) {
    /* istanbul ignore if  */
    if (this.get(options.name)) {
      throw new Error(`A publickey named "${options.name}" already exists`)
    }
    return await cache.puts('publickey', {
      value: options.publicKey
    })
  }

  async remove(publickey) {
    return await cache.remove('publickey', publickey)
  }

}

module.exports = PublicKeyManager
