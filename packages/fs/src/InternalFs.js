// const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config, Crypto, Entry} = require('@secrez/core')
const Node = require('./Node')
const Tree = require('./Tree')

class InternalFs {

  constructor(secrez) {
    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.dataPath = secrez.config.dataPath
      this.tree = new Tree(secrez)
    } else {
      throw new Error('InternalFs requires a Secrez instance during construction')
    }
  }

  async init() {
    // eslint-disable-next-line require-atomic-updates
    await this.tree.load()
  }

  getFullPath(entry) {
    return path.join(this.dataPath, entry.encryptedName)
  }

  async save(entry) {
    let fullPath = this.getFullPath(entry)
    /* istanbul ignore if  */
    if (await fs.pathExists(fullPath)) {
      throw new Error('File already exists')
    }
    let encryptedContent =
        entry.encryptedContent || entry.extraName
            ? (entry.encryptedContent || '') +
            (
                entry.extraName
                    ? 'I' + entry.extraName
                    : ''
            )
            : ''
    await fs.writeFile(fullPath, encryptedContent)
    entry.set({
      ts: Crypto.unscrambleTimestamp(entry.scrambledTs, entry.microseconds)
    })
    return entry
  }

  async unsave(entry) {
    let fullPath = this.getFullPath(entry)
    if (await fs.pathExists(fullPath)) {
      await fs.unlink(fullPath)
    }
  }

  async add(parent, entry) {
    if (entry.id) {
      throw new Error('A new entry cannot have a pre-existent id')
    }
    entry.set({id: Crypto.getRandomId()})
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    try {
      await this.save(entry)
      let node = new Node(entry)
      parent.add(node)
      await this.saveTree()
      return node
    } catch (e) {
      await this.unsave(entry)
      throw e
    }
  }

  async update(node, entry) {

    if (!node || !entry) {
      throw new Error('A Node and an Entry are required')
    }
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    try {
      await this.save(entry)
      node.move(entry)
      await this.saveTree()
      return node
    } catch (e) {
      await this.unsave(entry)
      throw e
    }
  }

  async saveTree() {
    let root = this.tree.root.getEntry()
    if (this.previousRoot) {
      // this creates a single index file per session.
      // TODO When git is used to distribute the data, after committing this.previousRoot must be canceled to avoid conflicts
      await this.unsave(this.previousRoot)
    }
    root.set({
      name: Crypto.getRandomBase58String(4),
      content: JSON.stringify(this.tree.root.toCompressedJSON(null, null, await this.tree.getAllFiles())),
      preserveContent: true
    })
    root = this.secrez.encryptEntry(root)
    await this.save(root)
    this.previousRoot = root
  }

  async make(options) {
    let p = this.normalizePath(options.path)
    let [ancestor, remainingPath] = this.tree.root.getChildFromPath(p, true)
    p = remainingPath.split('/')
    let len = p.length
    let child
    for (let i = 0; i < len; i++) {
      let notLast = i < len - 1
      let entry = new Entry({
        name: p[i],
        type: notLast ? config.types.DIR : options.type
      })
      if (this.isFile(options) && options.content) {
        entry.set({content: options.content})
      }
      child = await this.add(ancestor, entry)
      if (notLast) {
        ancestor = child
      }
    }
    return child
  }

  normalizePath(p) {
    if (!p || typeof p !== 'string') {
      throw new Error('The "path" option must exist and be of type string')
    }
    p = p.replace(/^~\/+/, '/').replace(/~+/g, '')
    p = path.resolve(this.tree.workingNode.getPath(), p)
    for (let v of p.split('/')) {
      if (v.length > 255) {
        throw new Error('File names cannot be longer that 255 characters')
      }
    }
    return p
  }

  async change(options) {
    let p = this.normalizePath(options.path)
    let n
    if (options.newPath) {
      n = this.normalizePath(options.newPath)
      if (p === n) {
        n = undefined
      }
    }
    let node = this.tree.root.getChildFromPath(p)
    if (!node) {
      throw new Error('Path does not exist')
    }
    let entry = new Entry(Object.assign(options, node.getEntry()))
    let [ancestor, remainingPath] = n ? this.tree.root.getChildFromPath(n, true) : []
    if (ancestor) {
      remainingPath = remainingPath.split('/')
      if (remainingPath.length > 1) {
        throw new Error('Cannot move a node to a not existing folder')
      }
      entry.name = remainingPath[0]
      if (ancestor.id !== node.parent.id) {
        entry.parent = ancestor
      }
    }
    await this.update(node, entry)
    return node
  }

  async remove(options) {
    let p = this.normalizePath(options.path)
    let node = this.tree.root.getChildFromPath(p)
    if (!node) {
      throw new Error('Path does not exist')
    }
    let deletedEntries = await node.remove(options.versions || node.lastTs)
    this.tree.addToDeletedEntries(deletedEntries)
    await this.saveTree()

    return true
  }

  isDir(node = {}) {
    return node.type !== config.types.FILE
  }

  isFile(node = {}) {
    return node.type === config.types.FILE
  }

  /* commands */

  async ls(options) {
    let list = await this.pseudoFileCompletion(options.path || '.')
    return list //FsUtils.filterLs(options.path, list)
  }

  async cat(options) {
    let p = this.getNormalizedPath(options.path)
    let node = this.tree.root.getChildFromPath(p)
    if (node && this.isFile(node)) {
      let result  = []
      if (options.all) {
        let versions = node.getVersions()
        for (let ts of versions) {
          result.push(await this.getEntryDetails(node, ts))
        }
      } else {
        result.push(await this.getEntryDetails(node, options.ts))
      }
      return result
    } else {
      throw new Error('Cat requires a valid file')
    }
  }

  async getEntryDetails(node, ts) {
    let content
    if (node.type === config.types.FILE) {
      content = node.getContent(ts)
      if (!content) {
        // must be read from disk
        let entry = node.getEntry(ts)
        let fullPath = this.getFullPath(entry)
        let [encryptedContent, extraName] = (await fs.readFile(fullPath, 'utf8')).split('I')
        entry.encryptedContent = encryptedContent
        entry.extraName = extraName
        let decryptedEntry = this.secrez.decryptEntry(entry)
        content = decryptedEntry.content
      }
    }
    return {
      id: node.id,
      name: node.getName(ts),
      content,
      ts: ts || node.lastTs
    }
  }

  cd(options) {
    let p = options.path
    if (!p || /^(\/|~|~\/)$/.test(p)) {
      this.tree.workingNode = this.tree.root
    } else if (p === '.') {
      // nothing
    } else {
      let node = this.tree.root.getChildFromPath(p)
      if (!this.isFile(node)) {
        this.tree.workingNode = node
      } else {
        throw new Error('You cannot cd to a file')
      }
    }
  }

  getNormalizedPath(p = '/') {
    p = p.replace(/^~\/+/, '/').replace(/~+/g, '')
    if (!p) {
      p = '/'
    }
    let resolvedDir = path.resolve(this.tree.workingNode.getPath(), p)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  async pseudoFileCompletion(files = '*', only) {
    if (!files) files = './'
    let p = this.getNormalizedPath(files)
    let end
    let node
    try {
      node = this.tree.root.getChildFromPath(p)
    } catch (e) {
      end = path.basename(p)
      node = this.tree.root.getChildFromPath(path.dirname(p))
    }
    if (node) {
      if (this.isFile(node)) {
        return [node.getName()]
      } else {
        let children = node.getChildrenNames()
        if (end) {
          end = end.replace(/\?/g, '.{1}').replace(/\*/g, '.*')
          let re = RegExp(end)
          children = children.filter(e => {
            return re.test(e)
          })
        }
        return children
      }
    }
    return []
  }

  pwd(options) {
    if (options.getNode) {
      return this.tree.workingNode.getName()
    } else { // getPath default
      return this.tree.root.getPathToChild(this.tree.workingNode)
    }
  }

  /*
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

  async cat(options) {
    let file = options.path
    file = path.resolve(config.workingDir, file)
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
            let content = await this.secrez.decryptEntry(data)
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
          let content = await this.secrez.decryptEntry(data)
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
        config.workingDir = dir
        this.workingDirObj = dirObj
      }
    } else {
      throw new Error('No such directory')
    }
  }


  // async mkdir(dir) {
  //   dir = path.resolve(config.workingDir, dir)
  //   let [decParent, encParent, encParentPath] = this.getParents(dir)
  //   if (decParent) {
  //     let dirname = path.basename(dir)
  //     if (!this.exists(decParent, dirname)) {
  //       let encDir = await this.secrez.encryptEntry(dirname)
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


   */


}

module.exports = InternalFs
