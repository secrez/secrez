const path = require('path')
const fs = require('fs-extra')

class DataCache {

  constructor(dataPath) {
    this.cache = {}
    if (dataPath) {
      this.dataPath = dataPath
      fs.ensureDirSync(dataPath)
      this.ensured = {}
    }
  }

  async load(key) {
    if (this.dataPath) {
      this.ensure(key)
      let files = await fs.readdir(path.join(this.dataPath, key))
      this.puts(key, files, true)
    }
  }

  async puts(key, value, dontSave, dontWait) {
    if (!this.cache[key]) {
      this.cache[key] = []
    }
    if (!Array.isArray(value)) {
      value = [value]
    }
    for (let v of value) {
      if (!this.cache[key].includes(v)) {
        this.cache[key].push(v)
        if (!dontSave) {
          if (dontWait) {
            this.save(key, v)
          } else {
            await this.save(key, v)
          }
        }
      }
    }
  }

  get(key) {
    return this.cache[key] || []
  }

  is(key, value) {
    return (this.cache[key] || []).includes(value)
  }

  ensure(key) {
    if (!this.ensured[key]) {
      fs.ensureDirSync(path.join(this.dataPath, key))
      this.ensured[key] = true
    }
  }

  async save(key, value) {
    if (this.dataPath) {
      this.ensure(key)
      await fs.writeFile(path.join(this.dataPath, key, value), '')
    }
  }

}

module.exports = DataCache
