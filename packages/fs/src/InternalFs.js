// const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config, Crypto, Entry} = require('@secrez/core')
const FsUtils = require('./FsUtils')
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

  async save(entry) {
    let fullPath = path.join(this.dataPath, entry.encryptedName)
    /* istanbul ignore if  */
    if (fs.existsSync(fullPath)) {
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
    let fullPath = path.join(this.dataPath, entry.encryptedName)
    if (this.fileExists(fullPath)) {
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
      this.unsave(entry)
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
      this.unsave(entry)
      throw e
    }
  }

  async saveTree() {
    let root = this.tree.root.getEntry()
    if (this.previousRoot) {
      this.unsave
    }
    root.set({
      name: Crypto.getRandomBase58String(4),
      content: JSON.stringify(this.tree.root.toJSON(null, null, await this.tree.getAllFiles())),
      preserveContent: true,
      lastTs: this.previousRoot ? this.previousRoot.lastTs : undefined
    })
    root = this.secrez.encryptEntry(root)
    await this.save(root)
    this.previousRoot = root
  }

  fileExists(file) {
    if (!file || typeof file !== 'string') {
      throw new Error('A valid file name is required')
    }
    return fs.existsSync(path.join(this.dataPath, file))
  }


  // maybe TODO
  async ls(files) {
    return FsUtils.filterLs(files, await this.pseudoFileCompletion(files))
  }

  pwd(options) {
    if (options.getNode) {
      return this.tree.workingNode.getName()
    } else { // getPath default
      return this.tree.root.getPathToChild(this.tree.workingNode)
    }
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
      if (options.type === config.types.FILE && options.content) {
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
    p = p.replace(/^~+/, '/').replace(/~+/g, '')
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
      // console.log(remainingPath[0], 'ancestor.id !== node.parent.id', ancestor.id, node.parent.id)
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

}

module.exports = InternalFs
