const _ = require('lodash')
const fs = require('./utils/fs')
const path = require('path')
const config = require('./config')
const Logger = require('./utils/Logger')
const {debug} = require('./utils/Logger')
const commandLineArgs = require('command-line-args')

class FileSystem {

  constructor(secrez) {
    this.secrez = secrez
    this.itemId = 1
  }

  static preParseCommandLine(commandLine) {
    let argv = []
    let k = 0
    let sep
    commandLine = _.trim(commandLine)
    for (let i = 0; i < commandLine.length; i++) {
      let c = commandLine[i]
      if (!sep && /("|')/.test(c)) {
        sep = c
      } else if (sep && c === sep) {
        sep = null
      } else if (!sep && c === '\\' && commandLine[i + 1]) {
        if (!argv[k]) argv[k] = ''
        argv[k] += commandLine[i + 1]
        i++
      } else if (!sep && c === ' ') {
        k++
      } else {
        if (!argv[k]) argv[k] = ''
        argv[k] += c
      }
    }
    return argv
  }

  static parseCommandLine(definitions, commandLine, onlyIfDefinitions) {
    if (definitions && commandLine) {
      const argv = FileSystem.preParseCommandLine(commandLine)
      return commandLineArgs(definitions, {argv})
    } else if (definitions && !onlyIfDefinitions) {
      return commandLineArgs(definitions)
    }
    return {}
  }

  async buildTree(dir) {
    let tree = {}
    let files = fs.readdirSync(dir)
    for (let file of files) {
      if (/\./.test(file)) {
        continue
      }
      let filePath = path.join(dir, file)
      let stat = fs.lstatSync(filePath)
      tree[`${this.itemId++};${file}`] = stat.isDirectory() ? await this.buildTree(filePath) : true
    }
    return tree
  }

  async decodeTree(dir) {
    let tree = {}
    for (let file in dir) {
      let [id, encrypted] = file.split(';')
      let name = this.secrez.decryptItem(encrypted).split(';')
      tree[`${id};${name}`] = dir[file] === true ? true : await this.decodeTree(dir[file])
    }
    return tree
  }

  async init(callback) {
    this.encodedTree = await this.buildTree(config.dataPath)
    this.decodedTree = await this.decodeTree(this.encodedTree)
  // debug(33, this.encodedTree)
  // debug(33, this.decodedTree)
    callback()
  }

  getDirPath(dir = '/') {
    dir = dir.replace(/^~/, '')
    // debug(111, dir)
    if (!dir) {
      dir = '/'
    }
    // debug(222, dir)
    return this.normalize(dir)
  }

  normalize(dir) {
    let resolvedDir = path.resolve(config.workingDir, dir)
    // debug(333, resolvedDir)
    let normalized = path.normalize(resolvedDir)
    // debug(444, normalized)
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

  getDirObj(parent, d) {
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
      // debug('getParent', dir, dir.length)
      let parent
      let ids = []
      for (let d of dir) {
        if (!parent) {
          parent = root
          continue
        }
        let [p, dirObj] = this.pickDir(parent, d)
        // debug('p, dirObj, parent, d', p, dirObj, parent, d)
        if (p) {
          let id = parseInt(p.split(';')[0])
          ids.push(id)
          parent = dirObj
        }
        // debug('getParent parent', parent)
      }
      return [parent, ids]
    }
  }

  getDir(dir, returnAnyway) {
    // debug('getDir', dir)
    let root = this.decodedTree
    if (dir === '/') {
      return root
    } else {
      dir = dir.split('/')
      // debug('getDir', dir)
      let parent
      for (let d of dir) {
        if (!parent) {
          parent = root
          continue
        }
        let c = 1
        if (returnAnyway) {
          c = this.countDir(parent, d)
        }
        let dirObj = this.getDirObj(parent, d)
        if (dirObj && c === 1) {
          parent = dirObj
        } else if (returnAnyway) {
          break
        } else {
          return null
        }
      }
      return parent
    }
  }

  getEncParent(ids) {
    let parent = this.encodedTree
    let encodedPath = ''
    for (let id of ids) {
      let [p, dirObj] = this.pickDir(parent, null, id)
      // debug(p, dirObj)
      if (dirObj) {
        parent = dirObj
        encodedPath += `/${p.replace(/^\d+;/, '')}`
      }
    }
    return [parent, encodedPath]
  }

  exists(decParent, dirname) {
    for (let d in decParent) {
      // debug('d', d)
      d = d.replace(/^\d+;/, '')
      if (d === dirname) {
        return true
      }
    }
    return false
  }

  async fileCompletion(files = '') {
    let originalFiles = files
    // debug('originalFiles', originalFiles)
    if (!files) files = './'
    // debug('files', files)
    let dir = this.getDirPath(files)
    // debug('dir', dir)
    let dirObj = this.getDir(dir, true)
    // debug('dirObj', dirObj)
    if (dirObj) {
      let list = []
      for (let e in dirObj) {
        list.push(e.replace(/^\d+;/, '') + (dirObj[e] === true ? '' : '/'))
      }
      // debug(list)
      let prefix
      // debug('list1', list)
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
      // debug('list', list)
      return list
    } else {
      return []
    }
  }

  getParents(dir) {
    let parent = path.dirname(dir)
  // debug('dir, parent', dir, parent)
    let [decParent, ids] = this.getParent(parent)
  // debug('decParent, ids', dir, decParent, ids)
    let [encParent, encParentPath] = this.getEncParent(ids)
  // debug(encParent, encParentPath)
    return [decParent, encParent, encParentPath]
  }

  // getEncPath(decParent, encParent, encParentPath, dir) {
  //   let id = this.getId(decParent, dir)
  //   let encName = this.getName(encParent, id)
  //   return path.join(encParentPath, encName)
  // }

  realPath(p) {
    if (p === '~') {
      p = ''
    }
    return path.join(config.dataPath, './' + p).replace(/\/+$/, '')
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

  readFile(file) {

  }

}

module.exports = FileSystem
