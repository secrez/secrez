const {DataCache} = require('@secrez/fs')

let cache = new DataCache

class AliasManager {

  static setCache(dataCache) {
    if (typeof dataCache === 'object') {
      cache = dataCache
    }
  }

  static getCache() {
    return cache
  }

  // constructor(cache) {
  //   this.cache = cache
  // }

  get(alias) {
    return cache.get('alias', alias)
  }

  validateCommand(line, regularCmds) {
    /* istanbul ignore if  */
    if (!line) {
      return 'No previous command'
    }
    let cmd = line.split(' ')[0]
    if (this.get(cmd)) {
      return 'Can not make an alias of an alias'
    }
    if (regularCmds && !regularCmds[cmd]) {
      return `"${cmd}" is not a valid command`
    }
  }

  validateName(name) {
    if (!/^(\w|-)+$/g.test(name)) {
      return `The name "${name}" is invalid. Aliases' names can be any combination of upper and lower letters, numerals, underscores and hiphens`
    }
  }

  async create(options) {
    /* istanbul ignore if  */
    if (this.get(options.name)) {
      throw new Error(`An alias named "${options.name}" already exists`)
    }
    return await cache.puts('alias', {
      value: options.name,
      content: options.commandLine
    })
  }

  async remove(alias) {
    return await cache.remove('alias', alias)
  }

  async rename(existentName, alias) {
    let old = this.get(existentName)
    if (await this.remove(existentName)) {
      return await this.create({
        name: alias,
        commandLine: old.content
      })
    }
  }

}

module.exports = AliasManager
