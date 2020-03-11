// const _ = require('lodash')
const fs = require('fs-extra')
// const path = require('path')
// const {config, Crypto} = require('@secrez/core')
// const FileSystemsUtils = require('./FileSystemsUtils')

class Tree {

  constructor(internalFS) {

    this.statutes = {
      UNLOADED: 0,
      LOADED: 1,
      BROKEN: 2
    }

    if (internalFS && internalFS.constructor.name === 'InternalFS') {
      this.fs = internalFS
      this.secrez = internalFS.secrez
      this.status = this.statutes.UNLOADED
    } else {
      throw new Error('Tree requires an InternalFS instance during construction')
    }
  }

  async load(dir) {

    const self = this

    if (this.status === this.statutes.LOADED) {
      return
    }

    let allFiles = {}
    let types = this.secrez.types
    for (let category in types) {

    }
    for (let t in types) {
      allFiles[t] = {}
    }
    let files = await fs.readdir(dir)
    for (let file of files) {
      if (/\./.test(file)) {
        continue
      }
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
          type,
          ts,
          name
        })
      } catch (err) {
        // the file is an unexpected not encrypted file. We ignore it, for now.
      }
    }

    for (let category in allFiles) {
      for (let id in allFiles[category]) {
        file.sort((a, b) => {
          let A = a.ts
          let B = b.ts
          // descending order
          return A < B ? 1 : A > B ? -1 : 0
        })
      }
    }

    // check the index
    let ik = Object.keys(allFiles[types.INDEX])
    if (ik.length > 1) {
      this.status = this.statutes.BROKEN
      throw new Error('There is more than one index. Execute `fix --tree` to try to rebuild a valid index')
    } else {
      try {
        this.tree = {
          treeRoot: [
            JSON.parse(allFiles[types.INDEX][ik[0]][0]),
            '/'
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
      treeRoot: this.tree.treeRoot
    }
    await fillTree(this.tree.treeRoot[0])

    this.currentParentId = 'treeRoot'
    this.currentParent = this.tree.treeRoot

    if (dk !== 0 || fk !== 0) {
      this.status = this.statutes.BROKEN
      throw new Error('Index does not contain some of the existing files. Execute `fix --tree` to add them to the index')
    }

    this.status = this.statutes.LOADED
  }

  getIdFromIndex(id) {
    return this.index[id]
  }

  addChild(parentId, child) {
    let parent
    if (parentId === this.currentParentId) {
      parent = this.currentParent
    } else {
      parent = this.getIdFromIndex(parentId)
    }
    this.index[child.id] = parent[0][child.id] = [child.type === this.secrez.types.DIR ? [] : true, [child.type, child.ts, child.name]]
  }

  async fixTree() {
    // TODO
  }


}

module.exports = Tree
