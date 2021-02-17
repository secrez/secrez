// Next line is to avoid that npm-check-unused reports it
require('sqlite3')
//

const path = require('path')
const fs = require('fs-extra')

const Crypto = require('@secrez/crypto')

class Db {

  constructor() {

    const dbDir = process.env.NODE_ENV === 'test'
        ? process.env.DBDIR || path.resolve(__dirname, '../../tmp/db')
        : path.resolve(__dirname, '../../db')

    fs.ensureDirSync(dbDir)
    const filename = path.join(dbDir, 'tunnels.sqlite3')

    this.knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename
      },
      useNullAsDefault: true
    })
  }

  async init(reset) {
    if (reset) {
      if (await this.knex.schema.hasTable('tunnels')) {
        await this.knex.schema.dropTable('tunnels')
      }
    }
    if (!(await this.knex.schema.hasTable('tunnels'))) {
      await this.knex.schema.createTable('tunnels', function (table) {
        table.text('publickey').unique()
        table.text('id').unique()
      })
    }
  }

  static newId() {
    return [
      Crypto.getRandomBase32String(2),
      Crypto.getRandomBase32String(3),
      Crypto.getRandomBase32String(2)
    ].join('-')
  }

  static isValidId(id) {
    try {
      id = id.split('-')
      return (
          Crypto.isBase32String(id.join('')) &&
          id[0].length === 2 &&
          id[1].length === 3 &&
          id[2].length === 2
      )
    } catch (e) {
    }
    return false
  }

}

module.exports = Db

