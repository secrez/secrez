// Next line is to avoid that npm-check-unused reports it
require('sqlite3')
//
const {Crypto} = require('@secrez/core')

class Db {

  constructor(filename) {

    this.filename = filename

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
        table.string('key').unique()
        table.string('value')
      })
    }
    if (!(await this.knex.schema.hasTable('publickeys'))) {
      await this.knex.schema.createTable('publickeys', function (table) {
        table.integer('addedAt').unsigned()
        table.integer('updatedAt').unsigned()
        table.text('publickey').unique()
        table.text('url').unique()
      })
    }
    // await this.knex.schema.dropTable('messages')
    if (!(await this.knex.schema.hasTable('messages'))) {
      await this.knex.schema.createTable('messages', function (table) {
        table.integer('timestamp').unsigned()
        // table.integer('microseconds').unsigned()
        table.integer('direction')
        table.text('payload')
        table.text('signature')
        table.text('publickey')
        table.index('timestamp', 'index_timestamp')
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

  async trustPublicKey(publickey, url) {
    if (!(await this.isTrustedPublicKey(publickey))) {
      let ts = Crypto.getTimestampWithMicroseconds()
      return this.insert({
        addedAt: ts[0],
        updatedAt: ts[0],
        publickey,
        url
      }, 'publickeys')
    } else {
      let existentUrl = await this.getTrustedPublicKeyUrl(publickey)
      if (existentUrl !== url) {
        let ts = Crypto.getTimestampWithMicroseconds()
        return this.knex('publickeys').update({
          updatedAt: ts[0],
          url
        }).where({
          publickey
        })
      }
    }
  }

  async isTrustedPublicKey(publickey) {
    let query = await this.select('*', 'publickeys', {publickey})
    return !!query[0]
  }

  async getTrustedPublicKeyUrl(publickey) {
    let query = await this.select('*', 'publickeys', {publickey})
    return query[0] ? query[0].url : undefined
  }

  async saveMessage(payload, signature, publickey, direction) {
    return this.insert({
      timestamp: Date.now(), //ts[0],
      // microseconds: ts[1],
      payload,
      signature,
      publickey,
      direction
    }, 'messages')
  }

  async getMessages(minTimestamp = 0, maxTimestamp = Date.now() + 1000, publickey, limit = 10, direction) {
    let messages = await this.knex.select('*').from('messages')
        .where('timestamp', '>=', minTimestamp)
        .andWhere('timestamp', '<=', maxTimestamp)
        .andWhere('publickey', publickey ? '=' : '!=', publickey ? publickey : '-')
        .andWhere('direction', direction ? '=' : '>', direction ? direction : 0)
        .orderBy('timestamp', 'asc')
        .limit(limit)
    return messages
  }

}

Db.FROM = 1
Db.TO = 2


module.exports = Db

