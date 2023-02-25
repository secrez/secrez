const chai = require('chai')
const assert = chai.assert

const TestHelpers = require('../src')

describe('#test-helpers', function () {

  describe('#initRandomEntry', function () {

    it('should return a random entry', async function () {
      let entry = TestHelpers.initRandomEntry('file')
      assert.isTrue(entry.id !== undefined)
    })

  })

})
