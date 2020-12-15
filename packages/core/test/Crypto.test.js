const chai = require('chai')
const assert = chai.assert
const Crypto = require('../src/Crypto')

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

})
