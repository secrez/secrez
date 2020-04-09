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

  async load() {

    if (this.status === this.statutes.LOADED) {
      return
    }

    let allIndexes = []
    let allFiles = []
    let files = await this.getAllFiles()

    for (let file of files) {
      let filePath = path.join(this.dataPath, file)
      this.notEmpty = true
      let entry = new Entry({
        encryptedName: file,
        preserveContent: true
      })
      if (file[file.length - 1] === 'O') {
        // there is an extraName
        let content = await fs.readFile(filePath, 'utf8')
        content = content.split('I')
        if (!content[1]) {
          throw new Error()
        }
        entry.set({
          encryptedName: file.substring(0, 254) + content[1]
        })
      }
      let decryptedEntry = this.secrez.decryptEntry(entry)
      if (decryptedEntry.type === config.types.ROOT) {
        let content = await fs.readFile(filePath, 'utf8')
        entry.set({
          encryptedContent: content.split('I')[0]
        })
        decryptedEntry = this.secrez.decryptEntry(entry)
        allIndexes.push(decryptedEntry)
      } else {
        allFiles.push(decryptedEntry)
      }
    }

    if (this.notEmpty) {

      if (!allIndexes.length) {
        throw new Error('A valid tree is missing. Run secrez with the options --fix to build a new flat tree')
      } else {

        allIndexes.sort(Node.sortEntry)
        allFiles.sort(Node.sortEntry)
        let json = Tree.deobfuscate(allIndexes[0].content)
        this.root = Node.fromJSON(json, this.secrez, allFiles.map(e => e.encryptedName))
      }

    } else {
      this.root = new Node(
          new Entry({
            type: config.types.ROOT
          })
      )
      this.root.add(new Node(
          new Entry({
            type: config.types.TRASH
          }), true
      ))
    }
    this.workingNode = this.root
    this.status = this.statutes.LOADED
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
