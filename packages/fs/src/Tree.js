// const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const Node = require('./Node')
const {config, Entry} = require('@secrez/core')

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
    let warning = 'The database looks corrupted. Execute `fix tree` to fix it.'

    const setWarning = () => {
      if (!this.errors.length || this.errors[0].message !== warning) {
        this.errors.unshift({
          type: 'warning',
          message: warning
        })
      }
    }

    for (let file of files) {
      this.notEmpty = true
      try {
        let entry = new Entry({
          encryptedName: file,
          preserveContent: true
        })
        // console.log(entry.get())

        if (file[file.length - 1] === 'O') {
          // there is an extraName
          let content = await fs.readFile(file, 'utf8')
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
          let content = await fs.readFile(path.join(this.dataPath, file), 'utf8')
          entry.set({
            encryptedContent: content.split('I')[0]
          })
          decryptedEntry = this.secrez.decryptEntry(entry)
          allIndexes.push(decryptedEntry)
        } else {
          allFiles.push(decryptedEntry)
        }
      } catch (e) {
        setWarning()
      }
    }

    if (this.notEmpty) {

      if (!allIndexes.length) {
        setWarning()
      } else {

        allIndexes.sort(Node.sortEntry)
        allFiles.sort(Node.sortEntry)
        let json = allIndexes[0].content
        try {
          this.root = Node.fromJSON(json, this.secrez, allFiles.map(e => e.encryptedName))
          if (this.root.deletedEntries) {
            this.addToDeletedEntries(this.root.deletedEntries)
            delete this.root.deletedEntries
          }
        } catch(e) {
          setWarning()
        }
      }

    } else {
      this.root = new Node(
            new Entry({
              type: config.types.ROOT
            })
        )
    }
    this.workingNode = this.root
    this.status = this.statutes.LOADED
  }

  addToDeletedEntries(deletedEntries = []) {
    if (deletedEntries.length) {
      if (!this.deletedEntries) {
        this.deletedEntries = []
      }
      for (let d of deletedEntries) {
        if (!this.deletedEntries.includes(d)) {
          this.deletedEntries.push(d)
        }
      }
    }
  }

  removeFromDeletedEntries(undeletedEntries = []) {
    // reversing a deletion, in a future version
    if (undeletedEntries.length && this.deletedEntries) {
      for (let d of undeletedEntries) {
        if (this.deletedEntries.includes(d)) {
          this.deletedEntries = this.deletedEntries.filter(e => e !== d)
        }
      }
    }
  }

}

module.exports = Tree
