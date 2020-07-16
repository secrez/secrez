const sqlite3 = require('sqlite3').verbose()
const fs = require('fs-extra')
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

    await this.knex.schema.createTable('config', function (table) {
      table.string('key')
      table.string('value')
    })

    await this.knex.schema.createTable('publickeys', function (table) {
      table.integer('timestamp').unsigned()
      table.integer('microseconds').unsigned()
      table.text('publickey')
    })

    await this.knex.schema.createTable('messages', function (table) {
      table.integer('timestamp').unsigned()
      table.integer('microseconds').unsigned()
      table.text('message')
      table.text('publickey')
    })
  }

  async insert(options, table) {
    return this.knex.insert(options).into(table)
  }

  async select(what = '*', table, where = {}) {
    return this.knex.select(what).from(table).where(where)
  }

  async getValueFromConfig(key) {
    return this.select('*', 'config', {key})
  }

  async saveKeyValueToConfig(key, value) {
    return this.insert({key, value}, 'config')
  }

  async trustPublicKey(publickey) {
    let ts = Crypto.getTimestampWithMicroseconds()
    return this.insert({
      timestamp: ts[0],
      microseconds: ts[1],
      publickey
    }, 'publickeys')
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

    console.log('timestamp', '>=', minTimestamp)
    console.log('timestamp', '<=', maxTimestamp)
    console.log('publickey', from ? '=' : '!=', from ? from : '-')

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

