const util = require('util')
const fs = require('fs-extra')
const path = require('path')
const {config, Crypto, Entry} = require('@secrez/core')
const Node = require('./Node')
const Tree = require('./Tree')
const {ENTRY_EXISTS} = require('./Messages')

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

  async add(parent, entry) {
    /* istanbul ignore if  */
    if (entry.id) {
      throw new Error('A new entry cannot have a pre-existent id')
    }
    entry.set({id: Crypto.getRandomId()})
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    try {
      await this.tree.saveEntry(entry)
      let node = new Node(entry)
      parent.add(node)
      await this.tree.preSave()
      return node
    } catch (e) {
      /* istanbul ignore if  */
      // eslint-disable-next-line no-constant-condition
      if (true) {
        await this.tree.unsaveEntry(entry)
        throw e
      }
    }
  }

  fixTree() {
    let result = []
    if (this.tree.alerts.length) {
      let files = this.tree.filesNotOnTree
      // let missingFiles = this.filesNotOnTree
      let allIndexes = this.tree.getAllIndexes()
      for (let i = 0; i < allIndexes.length; i++) {
        let tree = new Tree(this.secrez)
        tree.init(i)
        let allFilesOnTree = Tree.getAllFilesOnTree(this.root).sort()
        for (let j=0;j<files.length; j++) {
          if (allFilesOnTree.includes(files[j])) {
            let p = tree.root.findChildPathByFile(files[j])
            if (p) {
              //
            }
          }
        }
      }
    }
    return result
  }

  async update(node, entry) {

    /* istanbul ignore if  */
    if (!node || !entry) {
      throw new Error('A Node and an Entry are required')
    }
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    // console.log('entry.ts', entry.ts)
    try {
      await this.tree.saveEntry(entry)
      node.move(entry)
      await this.tree.preSave()
      return node
    } catch (e) {
      /* istanbul ignore if  */
      // eslint-disable-next-line no-constant-condition
      if (true) {
        await this.tree.unsaveEntry(entry)
        throw e
      }
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
    // console.log('\nchange', node.lastTs)

    if (!node) {
      throw new Error('Path does not exist')
    }
    let entry = new Entry(Object.assign(options, node.getEntry()))
    let ancestor, remainingPath
    // console.log('ancestor, remainingPath', ancestor?1:2, remainingPath)
    try {
      // console.log('n', n)
      let result = n ? this.tree.root.getChildFromPath(n, true) : []
      ancestor = result[0]
      remainingPath = result[1]
    } catch (e) {
      if (e.message === util.format(ENTRY_EXISTS, path.basename(n))) {
        let dir = this.tree.root.getChildFromPath(n)
        if (dir && Node.isDir(dir)) {
          ancestor = dir
          remainingPath = path.basename(p)
        }
      }
    }
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
    if (Node.isFile(entry) && !entry.content) {
      entry.content = node.getContent()
    }
    // console.log('entry.get()', entry.get().name, path.basename(n || ''))
    await this.update(node, entry)
    // console.log('\n\n')
    return node
  }

  async remove(options) {
    let p = this.normalizePath(options.path)
    // console.log(p)
    let node = this.tree.root.getChildFromPath(p)
    if (!node) {
      throw new Error('Path does not exist')
    }
    let deleted = await node.remove(options.version)
    await this.tree.preSave()
    return deleted
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
    p = p.replace(/^~+/, '~').replace(/^~\/+/, '/').replace(/~+/g, '')
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
          end = '^' + end.replace(/\?/g, '.{1}').replace(/\*/g, '.*').replace(/\\ /g, ' ')
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
      } catch (e) {
        return name
      }
    }
  }

}

module.exports = InternalFs
