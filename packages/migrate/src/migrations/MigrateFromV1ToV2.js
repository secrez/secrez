const fs = require('fs-extra')
const path = require('path')
const homedir = require('homedir')

const AliasManager = require('../utils/AliasManager')
const ContactManager = require('../utils/ContactManager')

const migrationConfig = require('./migrationConfig')
const Logger = require('../utils/Logger')

const {Node, Tree, InternalFs, ExternalFs, DataCache} = require('@secrez/fs')
const {Crypto, Secrez} = require('@secrez/core')

class MigrateFromV1ToV2 {

  constructor(prompt) {
    this.prompt = prompt
  }

  isMigrationNeeded() {
    const conf = this.prompt.secrez.getConf()
    this.currentVersion = conf.data.version || migrationConfig.firstVersion
    if (this.currentVersion !== migrationConfig.latestVersion) {
      return true
    }
  }

  async migrate(password, iterations) {

    Logger.reset(`
Ready to migrate Secrez's db from version 2 to the version 3. 

To avoid issue the current db will be backed up. 
In case of errors with the new version, run secrez-migrate with the option --reverse to restore the db.
`)
    let message = 'Would you like to continue?'
    let yes = await this.prompt.useConfirm({
      message,
      default: true
    })
    if (!yes) {
      Logger.reset('Exiting')
      process.exit(0)
    }

    await this.setUpSecrez(password, iterations)

    Logger.bold(`
Starting migration
`)
    await this.backup()

    await this.reEncryptTrees()
  }

  async setUpSecrez(password, iterations) {

    this.secrez = new (Secrez())()

    const root = path.join(homedir(), '.secrez-backup')
    const container = path.join(root, 'secrez')
    const localDir = path.join(root, 'tmp')
    await fs.emptyDir(localDir)

    await this.secrez.init(container, localDir)

    this.secrez.cache = new DataCache(path.join(this.secrez.config.container, 'cache'), this.secrez)
    this.secrez.cache.initEncryption('alias', 'contact')
    await this.secrez.cache.load('id')

    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs(this.secrez)

    await this.secrez.signup(password, iterations)

    await this.secrez.cache.load('alias')
    await this.secrez.cache.load('contact')

    this.aliasManager = new AliasManager(this.secrez.cache)
    this.contactManager = new ContactManager(this.secrez.cache)
  }

  async reEncryptTrees() {
    const ifs = this.prompt.internalFs
    let datasetInfo = await ifs.getDatasetsInfo()
    for (let dataset of datasetInfo) {
      await ifs.mountTree(dataset.index)
    }
    for (let ds of datasetInfo) {
      this.workingTree = ifs.trees[ds.index]
      console.log(JSON.stringify(this.workingTree.root.toJSON(), null, 2))
      // await this.migrateNode()
    }
  }

  async migrateNode() {
    let node = {}
    for (let key in this) {
      if (key === 'parent') {
        continue
      }
      if (key === 'children') {
        node.children = {}
      } else {
        node[key] = this[key]
      }
    }
    if (node.parent) {
      node.parentId = node.parent
      delete node.parent
    }
    if (this.children) {
      for (let id in this.children) {
        let child = this.children[id]
        node.children[id] = child.toJSON()
      }
    }
    return node

  }

  async backup() {
    let container = this.prompt.secrez.config.container
    let startedMarker = path.join(container, 'migration-started')
    await fs.writeFile(path.join(container, 'migration-started'), Date.now().toString())
    let dirname = path.dirname(container)
    let backupname = path.basename(container) + '-pre-migration-backup'
    let backupContainer = path.join(dirname, backupname)
    if (await fs.pathExists(backupContainer)) {
      await fs.remove(backupContainer)
    }
    await fs.copy(container, path.join(dirname, backupname))
    Logger.reset(`A backup of the db has been created at 
${backupContainer}`)

  }

  async reverse() {
    let container = this.prompt.secrez.config.container
    let dirname = path.dirname(container)
    let backupContainer = path.join(dirname, path.basename(container) + '-pre-migration-backup')
    if (await fs.pathExists(backupContainer)) {
      await fs.remove(container)
      await fs.copy(backupContainer, container)
      await fs.remove(backupContainer)
      Logger.reset(`The previoysly backed up db at 
${backupContainer}
has been restored at
${container}
and the backup has been deleted
`)
      return true
    } else {
      return false
    }
  }

}

module.exports = MigrateFromV1ToV2
