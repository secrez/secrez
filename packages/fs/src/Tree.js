const fs = require('fs-extra')
const path = require('path')
const Node = require('./Node')
const {config, Entry, Crypto} = require('@secrez/core')

class Tree {

  constructor(secrez) {

    this.alerts = []

    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.dataPath = secrez.config.dataPath
      this.status = Tree.statutes.UNLOADED
      this.errors = []
    } else {
      throw new Error('Tree requires a Secrez instance during construction')
    }
  }

  async getAllFiles() {
    return (await fs.readdir(this.dataPath)).filter(file => !/\./.test(file))
  }

  async decryptSecret(file) {
    let entry = new Entry({
      encryptedName: file,
      preserveContent: true
    })
    if (file[file.length - 1] === 'O') {
      // there is an extraName
      let content = await fs.readFile(path.join(this.dataPath, file), 'utf8')
      content = content.split('I')
      if (!content[1]) {
        throw new Error()
      }
      entry.set({
        encryptedName: file.substring(0, 254) + content[1]
      })
    }
    return [entry, this.secrez.decryptEntry(entry)]
  }

  async load() {

    if (this.status === Tree.statutes.LOADED) {
      return
    }

    let files = await this.getAllFiles()
    let allIndexes = []
    let allSecrets = []
    let allTags = []

    for (let file of files) {

      let [entry, decryptedEntry] = await this.decryptSecret(file)
      if (decryptedEntry.type === config.types.ROOT) {
        let content = await fs.readFile(path.join(this.dataPath, file), 'utf8')
        entry.set({
          encryptedContent: content.split('I')[0]
        })
        decryptedEntry = this.secrez.decryptEntry(entry)
        allIndexes.push(decryptedEntry)
      } else if (decryptedEntry.type === config.types.TAGS) {
        allTags.push(decryptedEntry)
      } else {
        allSecrets.push(decryptedEntry)
      }
    }

    if (allSecrets.length) {
      allSecrets.sort(Node.sortEntry)

      if (!allIndexes.length) {
        this.alerts.push('A valid tree is missing.\nThe following entries have been recovered and put in the root:')
        this.root = Node.initGenericRoot()
        this.workingNode = this.root
        for (let entry of allSecrets) {
          // console.log(entry)
          entry.parent = this.root
          this.root.add(new Node(entry))
          this.alerts.push(entry.name)
        }
        await this.save()
      } else {

        allIndexes.sort(Node.sortEntry)
        let allSecretsFiles = allSecrets.map(e => e.encryptedName)
        let json = JSON.parse(allIndexes[0].content)
        this.root = Node.fromJSON(json, this.secrez, allSecretsFiles)
        this.workingNode = this.root

        // verify the tree
        let allFilesOnTree = Tree.getAllFilesOnTree(this.root).sort()
        const filesNotOnTree = []
        for (let i = 0; i < allSecretsFiles.length; i++) {
          let file = allSecretsFiles[i]
          if (!allFilesOnTree.includes(file)) {
            filesNotOnTree.push(allSecrets[i])
          }
        }
        if (filesNotOnTree.length) {
          let toBeRecovered = {}
          let recoveredEntries = []
          FOR: for (let i = 1; i < allIndexes.length; i++) {
            json = JSON.parse(allIndexes[i].content)
            let root = Node.fromJSON(json, this.secrez, allSecretsFiles)
            allFilesOnTree = Tree.getAllFilesOnTree(root).sort()
            for (let j = 0; j < filesNotOnTree.length; j++) {
              let f = filesNotOnTree[j]
              if (allFilesOnTree.includes(f.encryptedName)) {
                let node = root.findChildById(f.id)
                if (node) {
                  let k = allSecretsFiles.indexOf(f.encryptedName)
                  toBeRecovered[node.getPath()] = allSecrets[k]
                  filesNotOnTree.splice(j, 1)
                  j--
                }
              }
              if (!files.length) {
                break FOR
              }
            }
          }
          let paths = Object.keys(toBeRecovered).sort()
          for (let p of paths) {
            let entry = toBeRecovered[p]
            // it can generate duplicate names
            let parentPath = p.replace(/\/[^\\/]+$/, '')
            if (parentPath) {
              // check if exists on with the same name
              // if so, the recovered one is trashed
              try {
                let parent = this.root.getChildFromPath(parentPath)
                if (parent) {
                  entry.parent = parent
                  if (await this.addAsChildOrVersion(parent, entry)) {
                    recoveredEntries.push(p)
                  }
                  continue
                }
              } catch (e) {
              }
            }
            entry.parent = this.root
            if (await this.addAsChildOrVersion(this.root, entry)) {
              recoveredEntries.push(p)
            }
          }
          this.alerts.push('Some files/versions have been recovered:')
          this.alerts = this.alerts.concat(recoveredEntries)
          await this.save()
        }
      }
      await this.loadTags(allTags)

    } else {
      this.root = Node.initGenericRoot()
      this.workingNode = this.root
      await this.loadTags()
    }
    this.status = Tree.statutes.LOADED
  }

  async addAsChildOrVersion(parent, entry) {
    // console.log(parent.getPath(), entry.name)
    let done = false
    let name = entry.name
    let existentChild = parent.findDirectChildByName(name)
    if (existentChild) {
      if (existentChild.type === entry.type) {

        let temporaryNode = new Node(entry)
        // if it is a dir, it has the same name, we don't need it. But
        if (Node.isFile(entry)) {
          let details = await this.getEntryDetails(existentChild)
          let tempDetails = await this.getEntryDetails(temporaryNode)
          if (details.content !== tempDetails.content) {
            entry.content = tempDetails.content
            existentChild.update(entry)
            done = true
          }
        }
        parent.trash(temporaryNode)
      } else {
        entry.name = await this.getVersionedBasename(existentChild.getPath())
        parent.add(new Node(entry))
        done = true
      }
    } else {
      parent.add(new Node(entry))
      done = true
    }
    return done
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

  static getAllFilesOnTree(node) {
    // get all the version currently in the tree to check for anomalies
    let results = []
    if (node.versions) {
      for (let ts in node.versions) {
        let version = node.versions[ts]
        if (version.file) {
          results.push(version.file)
        }
      }
    }
    if (node.children) {
      for (let id in node.children) {
        results = results.concat(Tree.getAllFilesOnTree(node.children[id]))
      }
    }
    return results
  }

  getNormalizedPath(p = '/') {
    p = p.replace(/^~+/, '~').replace(/^~\/+/, '/').replace(/~+/g, '')
    if (!p) {
      p = '/'
    }
    let resolvedDir = path.resolve(this.workingNode.getPath(), p)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  async getVersionedBasename(p, node = this.root) {
    p = this.getNormalizedPath(p)
    let dir = path.dirname(p)
    let fn = path.basename(p)
    let ext = path.extname(p)
    if (ext) {
      fn = fn.replace(RegExp(ext.replace(/\./, '\\.') + '$'), '')
    }
    let name = fn + ext
    let v = 1
    for (; ;) {
      try {
        node.getChildFromPath(path.join(dir, name))
        name = fn + '.' + (++v) + ext
      } catch (e) {
        return name
      }
    }
  }


  getFullPath(entry) {
    return path.join(this.dataPath, entry.encryptedName)
  }

  async unsaveEntry(entry) {
    let fullPath = this.getFullPath(entry)
    if (await fs.pathExists(fullPath)) {
      await fs.unlink(fullPath)
    }
  }

  async add(parent, entry, force) {

    /* istanbul ignore if  */
    if (entry.id) {
      throw new Error('A new entry cannot have a pre-existent id')
    }
    entry.set({id: Crypto.getRandomId()})
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    try {
      await this.saveEntry(entry)
      let node = new Node(entry)
      parent.add(node)
      await this.save()
      return node
    } catch (e) {
      /* istanbul ignore if  */
      // eslint-disable-next-line no-constant-condition
      if (true) {
        await this.unsaveEntry(entry)
        throw e
      }
    }
  }

  async update(node, entry) {

    /* istanbul ignore if  */
    if (!node || !entry) {
      throw new Error('A Node and an Entry are required')
    }
    entry.preserveContent = true
    entry = this.secrez.encryptEntry(entry)
    try {
      await this.saveEntry(entry)
      node.move(entry)
      await this.save()
      return node
    } catch (e) {
      /* istanbul ignore if  */
      // eslint-disable-next-line no-constant-condition
      if (true) {
        await this.unsaveEntry(entry)
        throw e
      }
    }
  }

  async saveEntry(entry) {
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
    return entry
  }

  disableSave() {
    this.doNotSave = true
  }

  enableSave() {
    delete this.doNotSave
  }

  async save() {
    if (this.doNotSave) {
      // used during imports with many entries, to optimize the performances
      return
    }
    let rootEntry = this.root.getEntry()
    if (this.previousRootEntry) {
      // this creates a single index file per session.
      // TODO When git is used to distribute the data, after committing this.previousRootEntry must be canceled to avoid conflicts
      await this.unsaveEntry(this.previousRootEntry)
    }
    rootEntry.set({
      name: Crypto.getRandomBase58String(4),
      content: JSON.stringify(this.root.toCompressedJSON(null, null, await this.getAllFiles())),
      preserveContent: true
    })
    rootEntry = this.secrez.encryptEntry(rootEntry)
    await this.saveEntry(rootEntry)
    this.previousRootEntry = rootEntry
  }

  async loadTags(allTags = []) {
    if (allTags.length) {
      allTags = allTags.sort(Node.sortEntry)[0]
      let content = await fs.readFile(path.join(this.dataPath, allTags.encryptedName), 'utf8')
      allTags.set({
        encryptedContent: content.split('I')[0]
      })
      allTags = this.secrez.decryptEntry(allTags)
      allTags.content = JSON.parse(allTags.content)
      this.tags = allTags
    } else {
      this.tags = new Entry({
        type: config.types.TAGS,
        content: {}
      })
    }
  }

  async addTag(node, tags) {
    let content = this.tags.content
    for (let tag of tags) {
      if (!content[tag]) {
        content[tag] = []
      }
      if (!content[tag].includes(node.id)) {
        content[tag].push(node.id)
      }
      this.tagsChanged = true
    }
    this.saveTags()
  }

  async removeTag(node, tags) {
    let content = this.tags.content
    for (let tag of tags) {
      if (content[tag].includes(node.id)) {
        content[tag] = content[tag].filter(e => e !== node.id)
        this.tagsChanged = true
      }
    }
    this.saveTags()
  }

  async listTags() {
    let result = []
    let tags = this.tags.content
    for (let t of Object.keys(tags).sort()) {
      result.push(`${t} (${tags[t].length})`)
    }
    return result.sort()
  }

  async getNodesByTag(list) {
    let result = []
    let tags = this.tags.content
    let tag = []
    if (list.length === 1) {
      tag = tags[list[0]] || []
    } else {
      let ttag = {}
      for (let l of list) {
        let tmp = this.tags.content[l] || []
        for (let id of tmp) {
          ttag[id] = true
        }
      }
      ttag = Object.keys(ttag)
      FOR: for (let id of ttag) {
        for (let s of list) {
          if (!tags[s].includes(id)) {
            continue FOR
          }
        }
        tag.push(id)
      }
    }
    let rev
    for (let id of tag) {
      if (!rev) {
        rev = this.reverseTags()
      }
      let node = this.root.findChildById(id)
      result.push([node.getPath(), rev[id].sort().join(' ')])
    }
    return result
  }

  reverseTags() {
    let reverse = {}
    for (let t in this.tags.content) {
      for (let id of this.tags.content[t]) {
        if (!reverse[id]) {
          reverse[id] = []
        }
        reverse[id].push(t)
      }
    }
    return reverse
  }

  async saveTags() {
    if (this.doNotSave || !this.tagsChanged) {
      return
    }
    delete this.tagsChanged
    let tags = new Entry(this.tags)
    if (this.previousTags) {
      await this.unsaveEntry(this.previousTags)
    }
    tags.set({
      name: Crypto.getRandomBase58String(4),
      content: JSON.stringify(tags.content),
      preserveContent: true
    })
    tags = this.secrez.encryptEntry(tags)
    await this.saveEntry(tags)
    this.previousTags = tags
  }

}


Tree.statutes = {
  UNLOADED: 0,
  LOADED: 1,
  BROKEN: 2
}


module.exports = Tree
