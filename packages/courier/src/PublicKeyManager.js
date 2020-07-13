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

  validateName(name) {
    if (!/^(\w|-)+$/g.test(name)) {
      return `The name "${name}" is invalid. Aliases' names can be any combination of upper and lower letters, numerals, underscores and hiphens`
    }
  }

  async create(options) {
    /* istanbul ignore if  */
    if (this.get(options.name)) {
      throw new Error(`An publickey named "${options.name}" already exists`)
    }
    return await cache.puts('publickey', {
      value: options.name,
      content: options.publicKey
    })
  }

  async remove(publickey) {
    return await cache.remove('publickey', publickey)
  }

  async rename(existentName, publickey) {
    let old = this.get(existentName)
    if (await this.remove(existentName)) {
      return await this.create({
        name: publickey,
        content: old.content
      })
    }
  }

}

module.exports = PublicKeyManager
