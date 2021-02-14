
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

}

module.exports = Migration
