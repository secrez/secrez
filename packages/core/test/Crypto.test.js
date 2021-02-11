const chai = require('chai')
const assert = chai.assert
const Crypto = require('../src/Crypto')
const {sleep} = require('@secrez/utils')

describe('#Crypto', function () {

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
