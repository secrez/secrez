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
      if (Node.isFile(options) && options.content) {
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
    return Entry.sanitizePath(p)
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

  async getEntryDetails(node, ts) {
    let content
    if (Node.isFile(node)) {
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
      type: node.type,
      id: node.id,
      name: node.getName(ts),
      content,
      ts: ts || node.lastTs
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

  async pseudoFileCompletion(options = {}, addSlashIfDir) {
    if (typeof options === 'string') {
      options = {path: options}
    }
    let files = options.path || './'
    let p = this.getNormalizedPath(files)
    let end
    let node
    try {
      node = this.tree.root.getChildFromPath(p)
    } catch (e) {
      end = path.basename(p)
      node = this.tree.root.getChildFromPath(path.dirname(p))
    }
    const getType = n => {
      if (addSlashIfDir) {
        return Node.isDir(n) ? '/' : ''
      }
      return ''
    }
    if (node) {
      if (Node.isFile(node)) {
        return [getType(node) + node.getName()]
      } else {
        let children = []
        for (let id in node.children) {
          children.push(node.children[id].getName() + getType(node.children[id]))
        }
        if (end) {
          end = '^' + end.replace(/\?/g, '.{1}').replace(/\*/g, '.*')
              + (options.forAutoComplete ? '' : '(|\\/)$')
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

  async getVersionedBasename(p) {
    p = this.getNormalizedPath(p)
    let dir = path.dirname(p)
    let fn = path.basename(p)
    let name = fn
    let v = 1
    for (; ;) {
      try {
        this.tree.root.getChildFromPath(path.join(dir, name))
        name = fn + '.' + (++v)
      } catch(e) {
        return name
      }
    }
  }

}

module.exports = InternalFs
