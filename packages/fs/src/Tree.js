// const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const Node = require('./Node')
const {config, Entry, Crypto} = require('@secrez/core')

class Tree {

  constructor(secrez) {

    this.statutes = {
      UNLOADED: 0,
      LOADED: 1,
      BROKEN: 2
    }

    this.alerts = []

    if (secrez && secrez.constructor.name === 'Secrez') {
      this.secrez = secrez
      this.dataPath = secrez.config.dataPath
      this.status = this.statutes.UNLOADED
      this.errors = []
    } else {
      throw new Error('Tree requires a Secrez instance during construction')
    }
  }

  async getAllFiles() {
    return (await fs.readdir(this.dataPath)).filter(file => !/\./.test(file))
  }

  async getAllIndexes(allFiles) {
    if (!allFiles) {
      allFiles = await this.getAllFiles()
    }
    return allFiles.filter(f => /^0/.test(f))
  }

  async getAllSecrets(allFiles) {
    if (!allFiles) {
      allFiles = await this.getAllFiles()
    }
    return allFiles.filter(f => /^[1-3]{1}/.test(f))
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

    if (this.status === this.statutes.LOADED) {
      return
    }

    let files = await this.getAllFiles()
    let allIndexes = []
    let allSecrets = []

    for (let file of files) {

      let [entry, decryptedEntry] = await this.decryptSecret(file)
      if (decryptedEntry.type === config.types.ROOT) {
        let content = await fs.readFile(path.join(this.dataPath, file), 'utf8')
        entry.set({
          encryptedContent: content.split('I')[0]
        })
        decryptedEntry = this.secrez.decryptEntry(entry)
        allIndexes.push(decryptedEntry)
      } else {
        allSecrets.push(decryptedEntry)
      }
    }

    if (allSecrets.length) {
      allSecrets.sort(Node.sortEntry)

      if (!allIndexes.length) {
        this.alerts.push('A valid tree is missing.\nThe following entries have been recovered and put in the root:')
        this.root = Node.initGenericRoot()
        for (let entry of allSecrets) {
          // console.log(entry)
          entry.parent = this.root
          this.root.add(new Node(entry))
          this.alerts.push(entry.name)
        }
        await this.preSave()
      } else {

        allIndexes.sort(Node.sortEntry)
        let allSecretsFiles = allSecrets.map(e => e.encryptedName)
        let json = Tree.deobfuscate(allIndexes[0].content)
        this.root = Node.fromJSON(json, this.secrez, allSecretsFiles)

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
            json = Tree.deobfuscate(allIndexes[i].content)
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
        }
      }
    } else {
      this.root = Node.initGenericRoot()
    }
    this.workingNode = this.root
    this.status = this.statutes.LOADED
  }

  async addAsChildOrVersion(parent, entry) {
    // console.log(parent.getPath(), entry.name)
    let done = false
    let name = entry.name
    let existentChild = parent.findDirectChildByName(name)
    if (existentChild) {
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
      await this.preSave()
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
      await this.preSave()
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
    entry.set({
      ts: Crypto.unscrambleTimestamp(entry.scrambledTs, entry.microseconds)
    })
    return entry
  }

  async preSave() {
    let rootEntry = this.root.getEntry()
    if (this.previousRootEntry) {
      // this creates a single index file per session.
      // TODO When git is used to distribute the data, after committing this.previousRootEntry must be canceled to avoid conflicts
      await this.unsaveEntry(this.previousRootEntry)
    }
    rootEntry.set({
      name: Crypto.getRandomBase58String(4),
      content: Tree.obfuscate(this.root.toCompressedJSON(null, null, await this.getAllFiles())),
      preserveContent: true
    })
    rootEntry = this.secrez.encryptEntry(rootEntry)
    await this.saveEntry(rootEntry)
    this.previousRootEntry = rootEntry
  }

  static obfuscate(json) {
    let chars = []
    let substs = {}
    for (let f of Tree.fragments) {
      let c
      for (; ;) {
        c = Crypto.randomCharNotInBase58()
        if (!chars.includes(c)) {
          chars.push(c)
          substs[f] = c
          break
        }
      }
    }
    let str = chars.join('')
    for (let i = 0; i < 5 + Math.round(Math.random() * 5); i++) {
      let c
      for (; ;) {
        c = Crypto.randomCharNotInBase58()
        if (!chars.includes(c)) {
          str += c
          break
        }
      }
    }
    if (typeof json === 'object') {
      json = JSON.stringify(json)
    }
    json = json.replace(/\{/g, substs['{'])
    json = json.replace(/\}/g, substs['}'])
    json = json.replace(/\[/g, substs['['])
    json = json.replace(/\]/g, substs[']'])
    json = json.replace(/:/g, substs[':'])
    json = json.replace(/"v"/g, substs['"v"'])
    json = json.replace(/"c"/g, substs['"c"'])
    json = json.replace(/"/g, substs['"'])
    json = json.replace(/,/g, substs[','])
    json = str + json
    return json
  }

  static deobfuscate(json) {
    let frs = Tree.fragments
    let substs = {}
    let first
    for (let i = 0; i < frs.length; i++) {
      if (!i) {
        first = json[0]
      }
      substs[frs[i]] = json[i]
    }
    for (let i = frs.length; i < 20; i++) {
      if (json[i] === first) {
        json = json.substring(i)
        break
      }
    }
    for (let i = frs.length - 1; i >= 0; i--) {
      json = json.replace(RegExp(substs[frs[i]], 'g'), frs[i])
    }
    return JSON.parse(json)
  }

}

Tree.fragments = [
  '{',
  '}',
  '[',
  ']',
  ':',
  '"v"',
  '"c"',
  '"',
  ','
]


module.exports = Tree
