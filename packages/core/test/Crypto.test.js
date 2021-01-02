const chai = require('chai')
const assert = chai.assert
const Crypto = require('../src/Crypto')
const {sleep} = require('@secrez/utils')

const {
  hash23456iterations
} = require('./fixtures')

describe('#Crypto', function () {


  describe('#toAES/fromAES', async function () {

    it('should encrypt and decrypt a string', async function () {
      const key = Crypto.generateKey(true)
      let encrypted = Crypto.toAES(hash23456iterations, key)
      let decrypted = Crypto.fromAES(encrypted, key)
      assert.equal(hash23456iterations, decrypted)
    })

  })

  describe('#fromTsToDate', async function () {

    it('should recover a date from a timestamp with microseconds', async function () {

      for (let i = 0; i < 20; i++) {
        let ts = Crypto.getTimestampWithMicroseconds().join('.')
        let d = (new Date).toISOString().substring(0, 18)
        assert.isTrue(RegExp('^' + d).test(Crypto.fromTsToDate(ts)[0]))
        sleep(1)
      }
    })

  })

})
