const _ = require('lodash')
const fs = require('fs-extra')
const {config, Crypto} = require('@secrez/core')

class TreeNode {

  constructor(options = {}) {

    if (typeof options !== 'object') {
      throw new Error('Invalid options passed to constructor')
    }

    let isRoot = options.type === config.types.INDEX

    if (options.type !== config.types.DIR
        && options.type !== config.types.FILE
        && !isRoot) {
      throw new Error('Unsupported type')
    }

    if (isRoot && options.parent) {
      throw new Error('The root node cannot have a parent')
    }

    if (!options.ts || typeof options.ts !== 'number'
        || (options.parentId && options.parentId.length !== 4)
        || !options.name || typeof options.name !== 'string'
        || !options.encryptedName || typeof options.encryptedName !== 'string') {
      throw new Error('Missing parameters')
    }

    this.id = options.id || Crypto.getRandomId()
    this.type = options.type

    if (options.parent && options.parent.constructor.name === 'TreeNode') {
      this.parent = options.parent
    }
    // a TreeNode can be independent of a tree.
    // But if it is part of a tree, any child must have a parent

    if (options.type === config.types.DIR) {
      this.children = {}
    }
    this.versions = {}
    this.lastTs = options.ts

    if (!isRoot) {
      if (options.name && options.encryptedName) {
        this.versions[options.ts] = {
          name: options.name,
          file: options.encryptedName
        }
      } else {
        throw new Error('Only the root node can miss an associated file')
      }
    }

  }

  static fromJSON(json, allFiles) {
    // It takes an already parsed object to make it an instance of the class.
    // It needs the list of files on disk to correctly recover timestamps and names

    // TODO
  }

  getAllFiles(child) {
    let result = []
    if (child.versions) {
      for (let v in child.versions) {
        result.push(child.versions[v].file)
      }
    }
    if (child.children) {
      for (let c in child.children) {
        result = result.concat(this.getAllFiles(child.children[c]))
      }
    }
    return result
  }

  calculateMinSize() {
    let allFiles = this.getAllFiles(this)
    let min = 0
    let minSize
    let arr = {}
    LOOP: while (!minSize) {
      min++
      for (let f of allFiles) {
        let s = f.substring(0, min)
        if (arr[s]) {
          continue LOOP
        }
        arr[s] = true
      }
      minSize = min
    }
  }

  toJSON(minSize) {
    // prepare the object to be stringified and saved on disk

    if (this.type === this.types.INDEX) {
      minSize = this.calculateMinSize()
    }

    if (this.type !== this.types.INDEX && !minSize) {
      throw new Error('The dataPath is needed')
    }

    const result = {
      i: this.id,
      t: this.type,
      v: []
    }

    if (this.versions)
      for (let ts of this.versions) {
        result.v.push(this.versions[ts].encryptedName.substring(0, minSize))
      }

    if (this.children) {
      result.c = {}
      for (let id of this.children) {
        result.c[id] = this.children[id].toJSON({
          minSize: minSize
        })
      }
    }

    return result
  }

  getName(ts) {
    try {
      return this.versions[ts || this.lastTs].name
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  getFile(ts) {
    try {
      return this.versions[ts || this.lastTs].file
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  move(options) {
    if (this.type === config.types.INDEX) {
      throw new Error('You cannot modify a root node')
    }

    if (options.id !== this.id) {
      throw new Error('Id does not match')
    }

    if (!this.versions[options.ts]) {
      this.versions[options.ts] = {
        name: options.name,
        file: options.encryptedName
      }
    } // else we are just moving it on the tree because versions are immutable

    if (options.parent
        && options.parent.constructor.name === 'TreeNode'
        && options.parent.id !== this.parent.id) {
      this.parent.removeChildren(this)
      options.parent.addChildren(this)
      this.parent = options.parent
    }
  }

  addChildren(children) {
    if (this.data.type === config.types.DIR) {
      // a child is a TreeNode instance
      if (!Array.isArray(children)) {
        children = [children]
      }
      for (let c of children) {
        c.parentId = this.data.id
        this.children[c.id] = c
      }
    } else {
      throw new Error('This item does not represent a folder')
    }
  }

  removeChildren(children) {
    if (!Array.isArray(children)) {
      children = [children]
    }
    for (let c of children) {
      delete this.children[c.id]
    }
  }

}


module.exports = TreeNode
