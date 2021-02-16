const fs = require('fs-extra')
const path = require('path')
const homedir = require('homedir')
const chalk = require('chalk')

const migrationConfig = require('./migrationConfig')
const Logger = require('../utils/Logger')

const {Node} = require('@secrez/fs')
const {Entry} = require('@secrez/core')
const {Prompt} = require('secrez')

class MigrateFromV1ToV2 {

  constructor(prompt) {
    this.prompt0 = prompt
  }

  isMigrationNeeded() {
    const conf = this.prompt0.secrez.getConf()
    this.currentVersion = conf.data.version || migrationConfig.firstVersion
    if (this.currentVersion !== migrationConfig.latestVersion) {
      return true
    }
  }

  async migrate(password, iterations) {

    Logger.reset(`
Ready to migrate Secrez's db from version 2 to the version 3. 

To avoid issues the current db will be backed up.
`)
    let message = 'Would you like to continue?'
    let yes = await this.prompt0.useConfirm({
      message,
      default: true
    })
    if (!yes) {
      Logger.reset('Exiting')
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    }

    await this.setUpSecrez(password, iterations)

    Logger.bold(`
Starting migration
`)

    let backupContainer = await this.backup()

    const ifs0 = this.prompt0.internalFs
    let datasetInfo = await ifs0.getDatasetsInfo()
    for (let dataset of datasetInfo) {
      await ifs0.mountTree(dataset.index)
    }
    for (let ds of datasetInfo) {
      Logger.reset(`Migrating ${ds.name} dataset...`)
      let {index} = ds
      if (index > 1) {
        // create a new dataset in V3
        await this.internalFs.mountTree(index, true)
        await this.internalFs.tree.nameDataset(ds.name)
      }
      let tree0 = ifs0.trees[index]
      let tree = this.internalFs.trees[index]
      this.current = {
        tree0,
        tree,
        index
      }
      tree.tags = tree0.tags
      tree.tagsChanged = true
      await tree.saveTags()
      // console.log(tree.tags)
      // process.exit()
      tree.disableSave()
      tree.root.children = tree0.root.children
      await this.migrateTree(tree0.root, tree.root)
      tree.enableSave()
      await tree.save()
    }
    await this.migrateHistories()
    await this.migrateAliases()
    await this.migrateEnv()
    await this.replaceDb()

    Logger.reset(`
${chalk.bold('Migration completed.')}

Now you can run Secrez as usual to use the new db.

A backup of the db has been created at 
${backupContainer}

If you see any errors running Secrez, execute 

  secrez-migrate -c ${this.prompt0.secrez.config.container} --reverse
  
to restore the previous database, reinstall a compatible version of secrez with

  pnpm i -g secrez@0.10.7
  
and contact secrez@sullo.co for help.
`)

    // eslint-disable-next-line no-process-exit
    process.exit(0)
  }

  async setUpSecrez(password, iterations) {

    const root = path.join(homedir(), '.secrez-migrate')
    const options = {
      container: path.join(root, 'db'),
      localDir: path.join(root, 'tmp')
    }
    this.container = options.container
    await fs.emptyDir(options.container)
    await fs.emptyDir(options.localDir)

    const prompt = new Prompt
    await prompt.init(options)

    this.secrez = prompt.secrez
    this.secrez.cache.initEncryption('alias', 'contact')
    await this.secrez.cache.load('id')

    this.internalFs = prompt.internalFs
    this.externalFs = prompt.externalFs

    await this.secrez.signup(password, iterations)

    await this.secrez.cache.load('alias')
    await this.secrez.cache.load('contact')

    await this.internalFs.init()

    this.prompt = prompt
  }

  async replaceDb() {
    let container = this.prompt0.secrez.config.container
    let tempContainer = this.secrez.config.container

    async function replace(what) {
      Logger.reset(`Replacing ${what}`)
      if (await fs.pathExists(path.join(container, what))) {
        await fs.remove(path.join(container, what))
      }
      let dest = path.join(container, what)
      await fs.ensureDir(path.dirname(dest))
      await fs.copy(path.join(tempContainer, what), dest)
    }

    let files = await fs.readdir(container)
    for (let file of files) {
      if (/data(\.\w|)/.test(file)) {
        await replace(file)
      }
    }
    await replace('cache')
    await replace('local')
    await replace('keys.json')
    await replace('keys/default.json')
  }

  async migrateEnv() {
    Logger.reset('Migrating local environment...')
    let env
    if (await fs.pathExists(this.prompt0.secrez.config.envPath)) {
      env = await fs.readFile(this.prompt0.secrez.config.envPath, 'utf8')
      env = JSON.parse(env)
      delete env.gitHub
    }
    if (!env) {
      env = {}
    }
    if (!env.migrations) {
      env.migrations = []
    }
    let migration = {
      from: 2,
      to: 3,
      when: Date.now()
    }
    env.migrations.push(migration)
    await fs.writeFile(this.secrez.config.envPath, JSON.stringify(env))
  }

  async migrateHistories() {
    Logger.reset('Migrating histories...')
    for (let what of ['main', 'chat']) {
      const history = path.join(this.prompt0.secrez.config.localDataPath, what + 'History')
      if (await fs.pathExists(history)) {
        let content = this.prompt0.secrez.decryptData(await fs.readFile(history, 'utf8'))
        await fs.writeFile(path.join(this.prompt.secrez.config.localDataPath, what + 'History'), this.secrez.encryptData(content))
      }
    }
  }

  async migrateAliases() {
    Logger.reset('Migrating aliases and contacts...')
    for (let what of ['alias', 'contact']) {
      const src = path.join(this.prompt0.secrez.config.container, 'cache', what)
      const dest = path.join(this.prompt.secrez.config.container, 'cache', what)
      if (!await fs.pathExists(src)) {
        continue
      }
      await fs.ensureDir(dest)
      const files = await fs.readdir(src)
      for (let file of files) {
        let content = await fs.readFile(path.join(src, file), 'utf8')
        if (what === 'alias') {
          file = this.prompt0.secrez.decryptData(file)
          content = this.prompt0.secrez.decryptData(content)
        }
        file = this.secrez.encryptData(file, true)
        content = this.secrez.encryptData(content)
        await fs.writeFile(path.join(dest, file), content)
      }
    }
  }

  async migrateTree(node, newNode) {
    await this.current.tree0.getEntryDetails(node)
    if (node.versions) {
      for (let ts in node.versions) {
        let version = node.versions[ts]
        let {name, content} = version
        let entry = new Entry({
          name,
          content,
          id: node.id,
          ts,
          type: node.type,
          preserveContent: true
        })
        let encryptedEntry = this.secrez.encryptEntry(entry, 'useTs')
        newNode.addVersion(encryptedEntry)

        // console.log(JSON.stringify(version, null, 2))
        // console.log(JSON.stringify(newNode.versions[ts], null, 2))

        await fs.writeFile(path.join(this.container, 'data' + (this.current.index ? '.' + this.current.index : ''), encryptedEntry.encryptedName), entry.content ? encryptedEntry.encryptedContent : '')
      }
    }
    if (node.children) {
      for (let id in node.children) {
        let child = node.children[id]
        let childEntry = child.getEntry()
        delete childEntry.parent
        let newChild = newNode.add(new Node(child.getEntry()), true)
        await this.migrateTree(child, newChild)
      }
    }
  }

  async backup() {
    let container = this.prompt0.secrez.config.container
    let dirname = path.dirname(container)
    let backupname = path.basename(container) + '-pre-migration-backup'
    let backupContainer = path.join(dirname, backupname)
    if (await fs.pathExists(backupContainer)) {
      await fs.remove(backupContainer)
    }
    await fs.copy(container, backupContainer)
    return backupContainer
  }

}

module.exports = MigrateFromV1ToV2
