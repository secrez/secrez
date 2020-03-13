const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config, Crypto} = require('@secrez/core')
const FileSystemsUtils = require('./FsUtils')
const Tree = require('./Tree')

class InternalFs {

  constructor(secrez) {
    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.tree = new Tree(secrez)
      this.dataPath = this.tree.dataPath
    } else {
      throw new Error('InternalFs requires a Secrez instance during construction')
    }
  }

  async init(callback) {
    // eslint-disable-next-line require-atomic-updates
    await this.tree.load()
    callback()
  }

  async save(item, id) {
    let fullPath = path.join(this.dataPath, item.encryptedName)
    await fs.writeFile(fullPath, [
          item.encryptedContent || '',
          item.extraName || ''
        ].join('\n')
    )
    item.ts = Crypto.unscrambleTimestamp(item.scrambledTs)
    return item
  }

  async unsave(item) {
    let fullPath = path.join(this.dataPath, item.encryptedName)
    await fs.unlink(fullPath)
  }

  async add(parentId, item) {
    let method = 'updateChild'
    if (!item.id) {
      item.id = Crypto.getRandomId()
      method = 'addChild'
    }
    item.preserveContent = true
    item = this.secrez.encryptItem(item)
    if (this.tree[method](parentId, item, null, true)) {
      item = await this.save(item)
      this.tree[method](parentId, item)
      return true
    }
    return false
  }


  getParents(dir) {
    let parent = path.dirname(dir)
    let [decParent, ids] = this.getParent(parent)
    let [encParent, encParentPath] = this.getEncParent(ids)
    return [decParent, encParent, encParentPath]
  }

  //////////////


  getNormalizedPath(dir = '/') {
    dir = dir.replace(/^~/, '')
    if (!dir) {
      dir = '/'
    }
    let resolvedDir = path.resolve(config.secrez.workingDir, dir)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  pickDir(parent, d, id) {
    for (let p in parent) {
      if (d) {
        if (p.replace(/^\d+;(.+)/, '$1') === d) {
          return [p, parent[p]]
        }
      } else if (id) {
        if (p.replace(/^(\d+);.+/, '$1') === `${id}`) {
          return [p, parent[p]]
        }
      }
    }
    return []
  }

  countDir(parent, d) {
    let c = 0
    for (let p in parent) {
      if (RegExp('^\\d+;' + d).test(p)) {
        c++
      }
    }
    return c
  }

  getId(parent, d) {
    let p = parent
    if (d) {
      p = this.pickDir(parent, d)[0]
    }
    if (p) {
      return parseInt(p.split(';')[0])
    }
  }

  getDirObject(parent, d) {
    let dirObj = this.pickDir(parent, d)[1]
    if (dirObj) {
      return dirObj
    }
  }

  getName(parent, id) {
    let p = parent
    if (id) {
      p = this.pickDir(parent, null, id)
    }
    if (p) {
      return p.replace(/^\d+;(.+)/, '$1')
    }
  }

  getParent(dir) {
    let root = this.decodedTree
    if (dir === '/') {
      return [root, []]
    } else {
      dir = dir.split('/')
      let parent
      let ids = []
      for (let d of dir) {
        if (!parent) {
          parent = root
          continue
        }
        let [p, dirObj] = this.pickDir(parent, d)
        if (p) {
          let id = parseInt(p.split(';')[0])
          ids.push(id)
          parent = dirObj
        }
      }
      return [parent, ids]
    }
  }

  getDir(dir, returnAnyway) {
    let root = this.decodedTree
    if (dir === '/') {
      return [true, root]
    } else {
      let isFolder = false
      dir = dir.split('/')
      let parent
      let d
      for (d of dir) {
        if (!parent) {
          parent = root
          continue
        }
        let c = 1
        if (returnAnyway) {
          c = this.countDir(parent, d)
        }
        let dirObj = this.getDirObject(parent, d)
        if (dirObj && c === 1) {
          parent = dirObj
          isFolder = true
        } else if (returnAnyway) {
          isFolder = false
          break
        } else {
          return [false]
        }
      }
      return [isFolder, parent]
    }
  }

  getEncParent(ids) {
    let parent = this.encodedTree
    let encodedPath = ''
    for (let id of ids) {
      let [p, dirObj] = this.pickDir(parent, null, id)
      if (dirObj) {
        parent = dirObj
        encodedPath += `/${p.replace(/^\d+;/, '')}`
      }
    }
    return [parent, encodedPath]
  }

  exists(decParent, dirname) {
    for (let d in decParent) {
      d = d.replace(/^\d+;/, '')
      if (d === dirname) {
        return true
      }
    }
    return false
  }

  async pseudoFileCompletion(files = '*', only) {
    let originalFiles = files
    if (!files) files = './'
    let dir = this.getNormalizedPath(files)
    let dirObj = this.getDir(dir, true)[1]
    if (dirObj) {
      let list = []
      for (let e in dirObj) {
        list.push(e.replace(/^\d+;/, '') + (dirObj[e] === true ? '' : '/'))
      }
      let prefix
      list = list.map(e => {
        if (/(^\.|\/)/.test(originalFiles)) {
          if (!prefix) {
            prefix = originalFiles.replace(/(\/)[^/]*$/, '$1')
            if (/^\.+$/.test(prefix)) {
              prefix += '/'
            }
          }
          return prefix + e
        } else {
          return e
        }
      })
      if (only) {
        list = _.filter(list, f => {
          if (only === config.onlyDir) {
            return /\/$/.test(f)
          } else {
            return !/\/$/.test(f)
          }
        })
      }
      return list
    } else {
      return []
    }
  }

  getParents(dir) {
    let parent = path.dirname(dir)
    let [decParent, ids] = this.getParent(parent)
    let [encParent, encParentPath] = this.getEncParent(ids)
    return [decParent, encParent, encParentPath]
  }

  realPath(p) {
    if (p === '~') {
      p = ''
    }
    return path.join(config.secrez.dataPath, './' + p).replace(/\/+$/, '')
  }

  isDir(dir) {
    let dirPath = this.realPath(dir)
    if (fs.existsSync(dirPath)) {
      return fs.lstatSync(dirPath).isDirectory()
    }
    return false
  }

  isFile(fn) {
    let dirPath = this.realPath(fn)
    if (fs.existsSync(dirPath)) {
      return fs.lstatSync(dirPath).isFile()
    }
    return false
  }

  async cat(options) {
    let file = options.path
    file = path.resolve(config.secrez.workingDir, file)
    let [decParent, encParent, encParentPath] = this.getParents(file)
    let [p] = this.pickDir(decParent, path.basename(file))
    if (p) {
      let id = p.replace(/^(\d+);.+/, '$1')
      let [encName] = this.pickDir(encParent, null, id)
      let filePath = this.realPath(`${encParentPath || ''}/${this.getName(encName)}`)
      if (fs.existsSync(filePath)) {
        let encDecFile = _.filter((await fs.readFile(filePath, 'utf8')).split('\n'), e => e)
        if (options.all) {
          let rows = []
          for (let row of encDecFile) {
            let [ver, ts, data] = row.split(';')
            let content = await this.secrez.decryptItem(data)
            rows.push([content, filePath, parseInt(ver), ts])
          }
          return rows
        } else {
          let row
          if (options.version) {
            for (let r of encDecFile) {
              if (RegExp(`^${options.version};`).test(r)) {
                row = r
                break
              }
            }
            if (!row) {
              throw new Error('Version not found')
            }
          } else {
            row = encDecFile[encDecFile.length - 1]
          }
          let [ver, ts, data] = row.split(';')
          let content = await this.secrez.decryptItem(data)
          return [content, filePath, parseInt(ver), ts]
        }
      }
    } else {
      throw new Error('No such file or directory')
    }
  }

  async cd(dir) {
    dir = this.getNormalizedPath(dir)
    let dirObj = this.getDir(dir)[1]
    if (dirObj) {
      if (dirObj === true) {
        throw new Error('Not a directory')
      } else {
        config.secrez.workingDir = dir
        this.workingDirObj = dirObj
      }
    } else {
      throw new Error('No such directory')
    }
  }


  async ls(files) {
    return FileSystemsUtils.filterLs(files, await this.pseudoFileCompletion(files))
  }

  // async mkdir(dir) {
  //   dir = path.resolve(config.secrez.workingDir, dir)
  //   let [decParent, encParent, encParentPath] = this.getParents(dir)
  //   if (decParent) {
  //     let dirname = path.basename(dir)
  //     if (!this.exists(decParent, dirname)) {
  //       let encDir = await this.secrez.encryptItem(dirname)
  //       if (encDir.length > 255) {
  //         throw new Error('The directory name is too long (when encrypted is larger than 255 chars.)')
  //       } else {
  //         let fullPath = path.join(encParentPath || '/', encDir)
  //         try {
  //           let realPath = this.realPath(fullPath)
  //           await fs.ensureDir(realPath)
  //           encParent[`${this.itemId};${encDir}`] = {}
  //           decParent[`${this.itemId++};${dirname}`] = {}
  //         } catch (e) {
  //           throw new Error(e.message)
  //         }
  //       }
  //     } else {
  //       throw new Error('The directory already exist.')
  //     }
  //
  //   } else {
  //     throw new Error('Parent directory not found.')
  //   }
  // }

  async pwd(options) {
    return config.secrez.workingDir
  }

}

module.exports = InternalFs
