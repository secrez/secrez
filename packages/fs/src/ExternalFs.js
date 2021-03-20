const fs = require('fs-extra')
const path = require('path')
const Crypto = require('@secrez/crypto')

class ExternalFs {

  constructor(secrez) {
    if (secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
    } else {
      throw new Error('ExternalFs requires a Secrez instance during construction')
    }
  }

  getNormalizedPath(file = '') {
    if (file === '~') {
      file = ''
    } else if (/^~\//.test(file)) {
      file = file.replace(/^~\//, '')
    }
    let resolvedFile = path.resolve(this.secrez.config.localWorkingDir, file)
    return path.normalize(resolvedFile)
  }

  async getFileList(options = {}) {
    try {
      return await this.fileList(options)
    } catch (e) {
      return []
    }
  }

  async fileList(options = {}) {
    if (typeof options === 'string') {
      options = {path: options}
    }
    let [isDir, list] = (await this.getDir(this.getNormalizedPath(options.path), options.forAutoComplete))
    list = list.filter(f => {
      let pre = true
      if (options.dironly) {
        pre = /\/$/.test(f)
      } else if (options.fileonly) {
        pre = !/\/$/.test(f)
      }
      if (pre && !options.all) {
        pre = !/^\./.test(f)
      }
      return pre
    })
    if (options.returnIsDir) {
      return [isDir, list]
    } else {
      return list
    }
  }

  async mapDir(dir) {
    let list = await fs.readdir(dir)
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i] + ((await this.isDir(path.join(dir, list[i]))) ? '/' : '')
    }
    return list
  }

  async getDir(dir, forAutoComplete) {
    let list = []
    let isDir = await this.isDir(dir)
    if (isDir) {
      list = await this.mapDir(dir)
    } else {
      let fn = path.basename(dir)
      if (fn) {
        if (await this.isFile(dir)) {
          list = [fn]
        } else {
          dir = dir.replace(/\/[^/]+$/, '/')
          if (await this.isDir(dir)) {
            list = await this.mapDir(dir)
          }
          fn = '^' + fn.replace(/\?/g, '.{1}').replace(/\*/g, '.*')
              + (forAutoComplete ? '' : '(|\\/)$')
          let re = RegExp(fn)
          list = list.filter(e => {
            return re.test(e)
          })
        }
      }
    }
    return [isDir, list]
  }

  async isDir(dir) {
    if (await fs.pathExists(dir)) {
      return (await fs.lstat(dir)).isDirectory()
    }
    return false
  }

  async isFile(fn) {
    if (await fs.pathExists(fn)) {
      return (await fs.lstat(fn)).isFile()
    }
    return false
  }

  async getVersionedBasename(p) {
    p = this.getNormalizedPath(p)
    let dir = path.dirname(p)
    let fn = path.basename(p)
    let name = fn
    let v = 1
    for (; ;) {
      let filePath = path.join(dir, name)
      if (!(await fs.pathExists(filePath))) {
        return name
      } else {
        name = fn + '.' + (++v)
      }
    }
  }

  shortPublicKey(pk) {
    return pk.split('$')[0].substring(0, 16)
  }

  encryptFile(content, options, secrez, stringify) {
    let key = Crypto.generateKey()
    let result = [
      '1', //version
      Crypto.encrypt(content, key)
    ]
    if (options.password) {
      result[2] = Crypto.encrypt(key, this.getUint8ArrayPassword(options.password))
    } else if (options.publicKeys) {
      if (!secrez || !secrez.encryptSharedData) {
        throw new Error('A secrez instance is required to encrypt using shared keys')
      }
      result[2] = this.shortPublicKey(secrez.getPublicKey())
      for (let publicKey of options.publicKeys) {
        let shortPublicKey = this.shortPublicKey(publicKey)
        let encKey = secrez.encryptSharedData(key, publicKey)
        result.push(shortPublicKey + encKey)
      }
    }
    return stringify ? result.join(',') : result
  }

  getUint8ArrayPassword(password) {
    return Crypto.bufferToUint8Array(Crypto.SHA3(password))
  }

  decryptFile(encryptedContent, options, secrez, contactsPKs, returnUint8Array) {
    if (typeof encryptedContent === 'string') {
      encryptedContent = encryptedContent.split(',')
    }
    const [version, content, passwordOrPK, ...keys] = encryptedContent
    if (version === '1') {
      if (keys && keys.length) {
        if (!secrez || !secrez.encryptSharedData) {
          throw new Error('A secrez instance is required to encrypt using shared keys')
        }
        if (!contactsPKs) {
          throw new Error('A list of contacts is required to encrypt using shared keys')
        }
        let contactPublicKey
        for (let pk of contactsPKs) {
          if (this.shortPublicKey(pk) === passwordOrPK) {
            contactPublicKey = pk
            break
          }
        }
        if (!contactPublicKey) {
          throw new Error('Sender\'s public key not in your contacts')
        }
        let shortPublicKey = this.shortPublicKey(secrez.getPublicKey())
        let key
        for (let item of keys) {
          let short = item.substring(0, 16)
          item = item.substring(16)
          if (shortPublicKey === short) {
            key = secrez.decryptSharedData(item, contactPublicKey, true)
          }
        }
        if (!key) {
          throw new Error('The sender didn\'t encrypt the data for you')
        }
        return Crypto.decrypt(content, key)
      } else {
        if (!options.password) {
          throw new Error('A password is required')
        }
        let key = Crypto.decrypt(passwordOrPK, this.getUint8ArrayPassword(options.password))
        return Crypto.decrypt(content, key, returnUint8Array)
      }
    } else {
      throw new Error('Unsupported version')
    }
  }

}

module.exports = ExternalFs
