const util = require('util')
const path = require('path')
const {config, Entry} = require('@secrez/core')
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
      child = await this.tree.add(ancestor, entry)
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
    let ancestor, remainingPath
    try {
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
    await this.tree.update(node, entry)
    return node
  }

  async remove(options) {
    let p = this.normalizePath(options.path)
    let node = this.tree.root.getChildFromPath(p)
    if (!node) {
      throw new Error('Path does not exist')
    }
    let deleted = await node.remove(options.version)
    await this.tree.preSave()
    return deleted
  }

  async pseudoFileCompletion(options = {}, addSlashIfDir) {
    if (typeof options === 'string') {
      options = {path: options}
    }
    let files = options.path || './'
    let p = this.tree.getNormalizedPath(files)
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

}

module.exports = InternalFs
