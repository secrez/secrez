// Next line is to avoid that npm-check-unused reports it
require('sqlite3')
//
const {Crypto} = require('@secrez/core')

class Db {

  constructor(filename) {

    this.knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename
      },
      useNullAsDefault: true
    })
  }

  async init() {

    if (!(await this.knex.schema.hasTable('config'))) {
      await this.knex.schema.createTable('config', function (table) {
        table.string('key')
        table.string('value')
      })
    }
    if (!(await this.knex.schema.hasTable('publickeys'))) {
      await this.knex.schema.createTable('publickeys', function (table) {
        table.integer('timestamp').unsigned()
        table.integer('microseconds').unsigned()
        table.text('publickey')
      })
    }
    if (!(await this.knex.schema.hasTable('messages'))) {
      await this.knex.schema.createTable('messages', function (table) {
        table.integer('timestamp').unsigned()
        table.integer('microseconds').unsigned()
        table.text('message')
        table.text('publickey')
      })
    }
  }

  async insert(options, table) {
    return this.knex.insert(options).into(table)
  }

  async select(what = '*', table, where = {}) {
    return this.knex.select(what).from(table).where(where)
  }

  async getValueFromConfig(key) {
    let result = await this.select('*', 'config', {key})
    if (result && result[0]) {
      return result[0].value
    }
  }

  async saveKeyValueToConfig(key, value) {
    if (await this.getValueFromConfig(key)) {
      return this.knex('config').update({value}).where({key})
    } else {
      return this.insert({key, value}, 'config')
    }
  }

  async trustPublicKey(publickey) {
    if (!(await this.isTrustedPublicKey(publickey))) {
      let ts = Crypto.getTimestampWithMicroseconds()
      return this.insert({
        timestamp: ts[0],
        microseconds: ts[1],
        publickey
      }, 'publickeys')
    }
  }

  async isTrustedPublicKey(publickey) {
    let query = await this.select('*', 'publickeys', {publickey})
    return !!query[0]
  }

  async saveMessage(message, publickey) {
    let ts = Crypto.getTimestampWithMicroseconds()
    return this.insert({
      timestamp: ts[0],
      microseconds: ts[1],
      message: JSON.stringify(message),
      publickey
    }, 'messages')
  }

  async getMessages(minTimestamp = 0, maxTimestamp = Crypto.getTimestampWithMicroseconds()[0], from) {
    let messages = await this.knex.select('*').from('messages')
        .where('timestamp', '>=', minTimestamp)
        .andWhere('timestamp', '<=', maxTimestamp)
        .andWhere('publickey', from ? '=' : '!=', from ? from : '-')
    return messages.map(e => {
      e.message = JSON.parse(e.message)
      return e
    })
  }

}


module.exports = Db

