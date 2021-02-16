const fs = require('fs-extra')
const path = require('path')
const Logger = require('../utils/Logger')

const MigrateFromV1ToV2 = require('./MigrateFromV1ToV2')

class Migration {

  constructor(prompt) {
    this.prompt = prompt
    this.migrateFromV1ToV2 = new MigrateFromV1ToV2(prompt)
  }

  isMigrationNeeded() {
    return this.migrateFromV1ToV2.isMigrationNeeded()
  }

  async migrate(password, iterations) {
    this.migrateFromV1ToV2.migrate(password, iterations)
  }

  async reverse() {
    let container = this.prompt.secrez.config.container
    let dirname = path.dirname(container)
    let backupContainer = path.join(dirname, path.basename(container) + '-pre-migration-backup')
    if (await fs.pathExists(backupContainer)) {
      await fs.remove(container)
      await fs.rename(backupContainer, container)
      Logger.reset(`The previoysly backed up db at 
${backupContainer}
has been restored at
${container}
and the backup has been deleted
`)
      return true
    } else {
      Logger.red('Backup not found for the container')
      return false
    }
  }

}

module.exports = Migration
