const path = require('path')
const fs = require('fs-extra')

class DataCache {

  constructor(dataPath, secrez) {
    this.secrez = secrez
    this.cache = {}
    if (dataPath) {
      this.dataPath = dataPath
      fs.ensureDirSync(dataPath)
      this.ensured = {}
      this.encrypted = {}
    }
  }

  async reset() {
    if (this.cache && process.env.NODE_ENV === 'test') {
      if (this.dataPath) {
        await fs.emptyDir(this.dataPath)
      }
      this.cache = {}
      this.ensured = {}
      this.encrypted = {}
    }
  }

  async load(key, isEncrypted) {
    if (this.dataPath) {
      this.ensure(key)
      let p = path.join(this.dataPath, key)
      let files = await fs.readdir(p)
      if (isEncrypted) {
        this.encrypted[key] = true
      }
      for (let i = 0; i < files.length; i++) {
        let content = await fs.readFile(path.join(p, files[i]), 'utf8')
        if (isEncrypted) {
          files[i] = {
            encryptedValue: files[i],
            value: this.secrez.decryptData(files[i]),
          }
          if (content) {
            files[i].content = this.secrez.decryptData(content)
          }
        } else {
          files[i] = {
            value: files[i]
          }
          if (content) {
            files[i].content = content
          }
        }
      }
      return this.puts(key, files, true)
    }
    return false
  }

  async puts(key, data, dontSave, dontWait) {
    if (!this.cache[key]) {
      this.cache[key] = {}
    }
    if (!Array.isArray(data)) {
      data = [data]
    }
    let counter = 0
    for (let v of data) {
      if (typeof v === 'string') {
        v = {
          value: v
        }
      }
      if (!dontSave) {
        if (dontWait && !this.encrypted[key]) {
          this.save(key, v)
        } else {
          v = await this.save(key, v)
        }
      }
      let value = v.value
      delete v.value
      this.cache[key][value] = v
      counter++
    }
    return counter
  }

  list(key) {
    return Object.keys(this.get(key))
  }

  get(key, value) {
    let all = this.cache[key] || {}
    if (value) {
      all = all[value]
    }
    return all
  }

  is(key, value) {
    return !!this.get(key, value)
  }

  ensure(key) {
    if (!this.ensured[key]) {
      fs.ensureDirSync(path.join(this.dataPath, key))
      this.ensured[key] = true
    }
  }

  async save(key, data) {
    if (this.dataPath) {
      this.ensure(key)
      let value = data.value
      let content = data.content || ''
      if (this.encrypted[key]) {
        value = this.secrez.encryptData(value)
        content = content ? this.secrez.encryptData(content) : ''
      }
      await fs.writeFile(path.join(this.dataPath, key, value), content)
      data.encryptedValue = value
      return data
    }
    return data
  }

  async remove(key, value) {
    let data = this.get(key, value)
    if (data) {
      let p = path.join(this.dataPath, key, data.encryptedValue || data.value)
      if (await fs.pathExists(p)) {
        await fs.unlink(p)
      }
      delete this.cache[key][value]
      return true
    } else {
      return false
    }
  }

}

module.exports = DataCache
