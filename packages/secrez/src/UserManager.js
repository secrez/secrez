const {DataCache} = require('@secrez/fs')

let cache = new DataCache

class UserManager {

  static setCache(dataCache) {
    if (typeof dataCache === 'object') {
      cache = dataCache
    }
  }

  static getCache() {
    return cache
  }

  get(user) {
    return cache.get('user', user)
  }

  validateName(name) {
    if (!/^(\w|-)+$/g.test(name)) {
      return `The name "${name}" is invalid. Aliases' names can be any combination of upper and lower letters, numerals, underscores and hiphens`
    }
  }

  async create(options) {
    /* istanbul ignore if  */
    if (this.get(options.name)) {
      throw new Error(`An user named "${options.name}" already exists`)
    }
    return await cache.puts('user', {
      value: options.name,
      content: options.publicKey
    })
  }

  async remove(user) {
    return await cache.remove('user', user)
  }

  async rename(existentName, user) {
    let old = this.get(existentName)
    if (await this.remove(existentName)) {
      return await this.create({
        name: user,
        content: old.content
      })
    }
  }

}

module.exports = UserManager
