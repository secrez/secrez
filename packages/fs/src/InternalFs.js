const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const {config, Entry, ConfigUtils} = require('@secrez/core')
const Node = require('./Node')
const Tree = require('./Tree')
const {ENTRY_EXISTS} = require('./Messages')

class InternalFs {

  constructor(secrez) {
    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.dataPath = secrez.config.dataPath
      this.trees = [new Tree(secrez), new Tree(secrez, 1)]
      this.treeIndex = 0
      this.tree = this.trees[this.treeIndex]
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

  normalizePath(p, index) {
    if (!p || typeof p !== 'string') {
      throw new Error('The "path" option must exist and be of type string')
    }
    p = p.replace(/^~\/+/, '/').replace(/~+/g, '')
    let tree = index ? this.trees[index] : this.tree
    p = path.resolve(tree.workingNode.getPath(), p)
    for (let v of p.split('/')) {
      if (v.length > 255) {
        throw new Error('File names cannot be longer that 255 characters')
      }
    }
    return Entry.sanitizePath(p)
  }

  async getIndexes(options) {
    let indexFrom
    let indexTo
    if (options.to || options.from) {
      for (let dataset of (await this.getDatasetsInfo())) {
        if (dataset.name.toLowerCase() === (options.to || '').toLowerCase()) {
          indexTo = dataset.index
        }
        if (dataset.name.toLowerCase() === (options.from || '').toLowerCase()) {
          indexFrom = dataset.index
        }
      }
    }
    if ((options.to && typeof indexTo === 'undefined') || (options.from && typeof indexFrom === 'undefined')) {
      throw new Error('Target dataset does not exist')
    }
    return [indexFrom || this.treeIndex, indexTo || this.treeIndex]
  }

  async change(options) {
    let [indexFrom, indexTo] = await this.getIndexes(options)
    if (!this.trees[indexFrom]) {
      await this.mountTree(indexFrom)
    }
    let treeFrom = this.trees[indexFrom]
    if (!this.trees[indexTo]) {
      await this.mountTree(indexTo)
    }
    let treeTo = this.trees[indexTo]
    let p = this.normalizePath(options.path, indexFrom)
    let n
    if (options.newPath) {
      n = this.normalizePath(options.newPath, indexTo)
      if (p === n && indexFrom === indexTo) {
        n = undefined
      }
    }
    let node = treeFrom.root.getChildFromPath(p)
    if (!node) {
      throw new Error('Path does not exist')
    }
    let entry = new Entry(Object.assign(options, node.getEntry()))
    let ancestor, remainingPath
    try {
      let result = n ? treeTo.root.getChildFromPath(n, true) : []
      ancestor = result[0]
      remainingPath = result[1]
    } catch (e) {
      if (e.message === util.format(ENTRY_EXISTS, path.basename(n))) {
        let dir = treeTo.root.getChildFromPath(n)
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
      entry.content = node.content = (await treeFrom.getEntryDetails(node)).content
    }
    if (!n && indexTo === indexFrom && entry.content === node.content) {
      // nothing changed
      return node
    }
    node = await treeFrom.update(node, entry)
    if (indexTo !== indexFrom) {
      let allFiles = await treeFrom.getAllDataFiles(node)
      let fromDatapath = ConfigUtils.getDatasetPath(this.secrez.config, indexFrom)
      let toDatapath = ConfigUtils.getDatasetPath(this.secrez.config, indexTo)
      for (let file of allFiles) {
        await fs.move(path.join(fromDatapath, file), path.join(toDatapath, file))
      }
      await treeTo.save()
    }
    return node
  }

  async remove(options, node) {
    if (!node) {
      let p = this.normalizePath(options.path)
      node = this.tree.root.getChildFromPath(p)
    }
    let deleted = await node.remove(options.version)

    await this.change()
    console.log(deleted)

    await this.tree.save()
    return deleted
  }

  async pseudoFileCompletion(options = {}, addSlashIfDir, returnNodes) {
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
        return returnNodes
            ? [node]
            : [getType(node) + node.getName()]
      } else {
        let children = []
        for (let id in node.children) {
          children.push(
              returnNodes
                  ? node.children[id]
                  : node.children[id].getName() + getType(node.children[id])
          )
        }
        if (end) {
          end = '^' + end.replace(/\?/g, '.{1}').replace(/\*/g, '.*').replace(/\\ /g, ' ')
              + (options.forAutoComplete ? '' : '(|\\/)$')
          let re = RegExp(end)
          children = children.filter(e => {
            return re.test(
                returnNodes
                    ? e.getName()
                    : e
            )
          })
        }
        return children
      }
    }
    return []
  }

  async mountTree(index, makeActive) {
    if (!this.trees[index]) {
      this.trees[index] = new Tree(this.secrez, index)
      await this.trees[index].load()
    }
    if (makeActive) {
      this.tree = this.trees[index]
      this.treeIndex = index
    }
  }

  async getDatasetsInfo() {
    let result = [{
      index: 0,
      name: 'main'
    }, {
      index: 1,
      name: 'trash'
    }]
    if (!this.treeCache) {
      this.treeCache = []
    }
    let datasets = ConfigUtils.listDatasets(this.secrez.config)
    if (datasets.length > 2) {
      for (let i = 2; i < datasets.length; i++) {
        let name
        if (this.trees[i]) {
          name = this.trees[i].name
        } else if (this.treeCache[i]) {
          name = this.treeCache[i]
        } else {
          let tree = new Tree(this.secrez, i)
          name = await tree.getName()
          this.treeCache[i] = name
        }
        result.push({
          index: i,
          name
        })
      }
    }
    return result
  }

  async getDatasetInfo(name) {
    let datasets = await this.getDatasetsInfo()
    for (let dataset of datasets) {
      if (dataset.name.toLowerCase() === name.toLowerCase()) {
        return dataset
      }
    }
  }

  updateTreeCache(index, name) {
    this.treeCache[index] = name
  }
}

module.exports = InternalFs
