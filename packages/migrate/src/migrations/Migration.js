const migrationConfig = require('./migrationConfig')
const MigrateFromV1ToV2 = require('./MigrateFromV1ToV2')

class Migration {

  constructor(secrez) {
    this.secrez = secrez
  }

  isMigrationNeeded() {
    const conf = this.secrez.getConf()
    this.currentVersion = conf.data.version || migrationConfig.firstVersion
    if (this.currentVersion !== migrationConfig.latestVersion) {
      return true
    }
  }

  migrate() {

  }

}

module.exports = Migration
