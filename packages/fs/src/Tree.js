// const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')

class Tree {

  constructor(secrez) {

    this.statutes = {
      UNLOADED: 0,
      LOADED: 1,
      BROKEN: 2
    }

    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.dataPath = this.secrez.config.secrez.dataPath
      this.status = this.statutes.UNLOADED
    } else {
      throw new Error('Tree requires a Secrez instance during construction')
    }
  }

  async load() {

    const self = this

    if (this.status === this.statutes.LOADED) {
      return
    }

    let allFiles = {}
    let types = this.secrez.types
    for (let t in types) {
      allFiles[types[t]] = {}
    }
    let files = await fs.readdir(this.dataPath)
    for (let file of files) {
      if (/\./.test(file)) {
        continue
      }
      this.notEmpty = true
      try {
        let [id, type, ts, name] = this.secrez.decryptItem(file)
        if (allFiles[type]) {
          // should we generate a warning because there is some unexpected encrypted file in the folder?
          continue
        }
        if (!allFiles[type][id]) {
          allFiles[type][id] = []
        }
        allFiles[type][id].push({
          ts,
          name,
          file
        })
      } catch (err) {
        // the file is an unexpected not encrypted file. We ignore it, for now.
      }
    }

    if (this.notEmpty) {

      for (let category in allFiles) {
        for (let id in allFiles[category]) {
          allFiles[category][id].sort(Tree.sortItem)
        }
      }

      // check the index
      let ik = Object.keys(allFiles[types.INDEX])
      if (ik.length > 1) {
        this.status = this.statutes.BROKEN
        throw new Error('There is more than one index. Execute `fix --tree` to build a valid index')
      } else {
        try {
          this.tree = {
            root: [
              JSON.parse(allFiles[types.INDEX][ik[0]][0]),
              [[Date.now(), '/']]
            ]
          }
        } catch (err) {
          this.status = this.statutes.BROKEN
          throw new Error('Index is corrupted. Execute `fix --tree` to try to build a new valid index')
        }
      }
      let dk = Object.keys(allFiles[types.DIR]).length
      let fk = Object.keys(allFiles[types.FILE]).length
      if (dk || fk) {
        this.status = this.statutes.BROKEN
        throw new Error('There are files without any index. Execute `fix --tree` to build a valid, flat index')
      }

      // verify that the index is aligned with the contents
      // eslint-disable-next-line no-inner-declarations
      async function fillTree(dir) {
        for (let id of dir) {
          let t = dir[id] === true ? types.DIR : types.FILE
          let data = allFiles[t][id]
          if (data) {
            // index contains only latest version
            dir[id][1] = data[0]
          } else {
            this.status = this.statutes.BROKEN
            throw new Error('Index contains not existing files. Execute `fix --tree` to try to rebuild a valid index')
          }
          self.index[id] = dir[id]
          if (t === types.DIR) {
            await fillTree(dir[id][0])
            dk--
          } else {
            fk--
          }
        }
      }

      this.index = {
        root: this.tree.root
      }
      await fillTree(this.tree.root[0])
      if (dk !== 0 || fk !== 0) {
        this.status = this.statutes.BROKEN
        throw new Error('Index does not contain some of the existing files. Execute `fix --tree` to add them to the index')
      }
    } else {
      this.tree = {
        root: [
          {},
          [[Date.now(), '/']]
        ]
      }
      this.index = {
        root: this.tree.root
      }
    }
    this.workingDirectoryId = 'root'
    this.workingDirectory = this.tree.root
    this.status = this.statutes.LOADED
  }

  getPathTo(childId, parent = this.tree.root, fullpath = '/') {
    if (!this.index[childId]) {
      return undefined
    }
    if (parent[0][childId]) {
      return path.resolve(fullpath, parent[1][0][1], parent[0][childId][1][0][1])
    } else {
      for (let id in parent[0]) {
        if (typeof parent[0][id][0] === 'object') {
          let p = this.getPathTo(childId, parent[0][id], path.resolve(fullpath, parent[1][0][1]))
          if (p) {
            return p
          }
        }
      }
      return undefined
    }
  }

  static sortItem(a, b) {
    let A = a.ts || a[0]
    let B = b.ts || b[0]
    // descending order
    return A < B ? 1 : A > B ? -1 : 0
  }

  getParentFromIndex(id) {
    return this.index[id]
  }

  fileExists(file) {
    if (!file || typeof file !== 'string') {
      throw new Error('File is required')
    }
    return fs.existsSync(path.join(this.dataPath, file))
  }

  addChild(parentId, child, file) {
    let parent
    if (!parentId || parentId === this.workingDirectoryId) {
      parent = this.workingDirectory
    } else {
      parent = this.getParentFromIndex(parentId)
    }
    if (!parent) {
      throw new Error('Parent does not exist')
    }
    if (this.index[child.id]) {
      throw new Error('Child already exists')
    }
    if (!file) {
      file = child.encryptedName
    }
    if (!this.fileExists(file)) {
      throw new Error('The relative file does not exist')
    }
    this.index[child.id] = parent[0][child.id] = [child.type === this.secrez.types.DIR ? {} : true, [[child.ts, child.name, file]]]
  }

  updateChild(child, file) {
    if (!this.index[child.id]) {
      throw new Error('Child does not exist')
    }
    if (!file) {
      file = child.encryptedName
    }
    if (!this.fileExists(file)) {
      throw new Error('The relative file does not exist')
    }
    this.index[child.id][1]
        // We assume it is more recent than the previous version.
        // If not, there is something wrong somewhere else
        // (we could throw an error if that happens)
        .unshift([child.ts, child.name, file])
  }

  findParent(childId, parent) {
    // we could optimize adding a second index with the parent of any child
    if (!this.index[childId]) {
      return undefined
    }
    if (!parent) {
      parent = this.tree.root
    }
    if (parent[0][childId]) {
      return parent
    } else {
      for (let id in parent[0]) {
        if (typeof parent[0][id][0] === 'object') {
          let p = this.findParent(childId, parent[0][id])
          if (p) {
            return p
          }
        }
      }
      return undefined
    }
  }

  moveChild(newParentId, childId) {
    let newParent
    if (!newParentId || newParentId === this.workingDirectoryId) {
      newParent = this.workingDirectory
    } else {
      newParent = this.getParentFromIndex(newParentId)
    }
    if (!newParent) {
      throw new Error('New parent does not exist')
    }
    let oldParent = this.findParent(childId)
    if (!oldParent) {
      throw new Error('Fatal error. Current parent not found')
    }
    newParent[0][childId] = oldParent[0][childId]
    delete oldParent[0][childId]
  }

  deleteChild(childId) {
    let parent = this.findParent(childId)
    if (!parent) {
      throw new Error('Fatal error. Current parent not found')
    }
    for (let i of parent[0][childId][1]) {
      let file = i[2]
      if (this.fileExists(file)) {
        throw new Error('Can remove a child only if related files do not exist')
      }
    }
    delete parent[0][childId]
  }


  async fixTree() {
    // TODO
  }


}

module.exports = Tree
