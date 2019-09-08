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
    this.itemId = 0
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
    let [p] = this.pickDir(parent, d)
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
    let [p] = this.pickDir(parent, null, id)
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
      if (dirObj) {
        parent = dirObj
        encodedPath += `/${p.replace(/^\d+;/, '')}`
      }
    }
    return [parent, encodedPath]
  }

  dirExists(decParent, dirname) {
    for (let d in decParent) {
      // debug('d', d)
      d = d.replace(/^\d+;/, '')
      if (d === dirname) {
        return true
      }
    }
    return false
  }

  async fileCompletion(files) {
    let originalFiles = files

    let dir = this.getDirPath(files)
    let dirObj = this.getDir(dir, true)

    if (dirObj) {
      let list = Object.keys(dirObj).map(e => e.replace(/^\d+;/, ''))
      let dirname = path.basename(dir)
      // debug(list)
      // debug('dirname', dirname)
      let addFilter = false
      let prefix

      list = _.filter(list, e => {
        if (dirname) {
          // debug(e, e.indexOf(dirname))
          return !e.indexOf(dirname)
        } else {
          return true
        }
      }).map(e => {
        // debug(originalFiles, path.dirname(originalFiles))

        if (/\//.test(originalFiles) && path.dirname(originalFiles) !== '/') {
          addFilter = true
          if (!prefix) {
            prefix = originalFiles.replace(/\/[^/]*$/, '')
          }
          return path.join(prefix, e)
        } else {
          return e
        }
      })
      return list
    } else {
      return []
    }
  }

  getParents(dir) {
    let parent = path.dirname(dir)
    let [decParent, ids] = this.getParent(parent)
    // debug('decParent, ids', parent, decParent, ids)
    let [encParent, encParentPath] = this.getEncParent(ids)
    return [decParent, encParent, encParentPath]
  }

  getEncPath(decParent, encParent, encParentPath, dir) {
    let id = this.getId(decParent, dir)
    let encName = this.getName(encParent, id)
    return path.join(encParentPath, encName)
  }

  async ls(files) {
    let dirObj
    if (files) {
      files = files ? path.resolve(config.workingDir, `./${files}`) : config.workingDir
      // debug('files', files)
      dirObj = this.getDir(files)
      // debug('dirObj', dirObj)
    } else {
      dirObj = this.workingDirObj || this.decodedTree
    }
    if (dirObj) {
      return Object.keys(dirObj).map(e => e.replace(/^\d+;/, ''))
    }
  }

  async cd(dir) {
    // debug('normalize', this.normalize(dir))
    dir = this.getDirPath(dir)
    let dirObj = this.getDir(dir)
    if (dirObj) {
      config.workingDir = dir
      this.workingDirObj = dirObj
    } else {
      Logger.red('No such file or directory')
    }
  }

  async mkdir(dir, parents) {
    dir = path.resolve(config.workingDir, dir)

    // debug('dir', dir)
    // debug('normalize', this.normalize(dir))

    let [decParent, encParent, encParentPath] = this.getParents(dir)
    if (decParent) {

      // debug('decParent', decParent)

      let dirname = path.basename(dir)
      // debug('dirname', dirname)

      if (!this.dirExists(decParent, dirname)) {
        let encDir = await this.secrez.encryptItem(dirname)
        if (encDir.length > 255) {
          Logger.red('The directory name is too long (when encrypted is larger than 255 chars.)')
        } else {
          let fullPath = path.join(encParentPath || '/', encDir)
          // debug('encParentPath', encParentPath)
          // debug('fullPath', fullPath)
          try {
            let realPath = this.realPath(fullPath)
            await fs.ensureDirAsync(realPath)
            encParent[`${this.itemId};${encDir}`] = {}
            decParent[`${this.itemId++};${dirname}`] = {}
          } catch (e) {
            Logger.red(e.message)
            return false
          }
          //
          // debug(33, this.encodedTree)
          // debug(33, this.decodedTree)
          //
          return true
        }
      } else {
        Logger.red('The directory already exist.')
      }

    } else {
      Logger.red('Parent directory not found. Use "-p" to create the parent directories too.')
    }
    return false
  }

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
