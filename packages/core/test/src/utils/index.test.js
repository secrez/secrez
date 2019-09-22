const chai = require('chai')
const assert = chai.assert
const utils = require('../../../src/utils')

describe('#utils', function () {


  describe('capitalize', async function () {

    it('should capitalize a string', async function () {
      assert.equal(utils.capitalize('string'), 'String')
    })

    it('should throw if the parameter is not a string or it has zero length', function () {
      try {
        utils.capitalize(23)
      } catch (e) {
        assert.equal(e.message, 'Not a string')
      }

      try {
        utils.capitalize('')
      } catch (e) {
        assert.equal(e.message, 'Not a string')
      }
    })

  })

  describe('sortKeys', async function () {

    let obj = {
      a: 1,
      c: 2,
      b: 3
    }

    it('should sort an object or convert an array in sorted object', async function () {
      assert.equal(
          JSON.stringify(Object.keys(utils.sortKeys(obj))),
          '["a","b","c"]'
      )
    })

  })

  describe('sleep', async function () {

    it('should sleep for ~ 100 millisecond', async function () {
      let now = Date.now()
      await utils.sleep(100)
      let diff = Date.now() - now
      assert.isTrue(diff > 80 && diff < 120)
    })

    it('should not wait if the parameter is invalid', async function () {
      let now = Date.now()
      await utils.sleep(-100)
      let diff = Date.now() - now
      assert.isTrue(diff < 5)
      now = Date.now()
      await utils.sleep('some string')
      diff = Date.now() - now
      assert.isTrue(diff < 5)
    })

  })

  describe('isIp', async function () {

    it('should confirm 232.12.24.36 is a valid IP', async function () {
      assert.isTrue(utils.isIp('232.12.24.36'))
    })

    it('should fail if not ip or invalid format', async function () {
      assert.isFalse(utils.isIp('2322.12.24.36'))
      assert.isFalse(utils.isIp('232.12.24.36.23'))
      assert.isFalse(utils.isIp('24.36'))
      assert.isFalse(utils.isIp('232333336'))
    })

  })

  describe('intToBase58', async function () {

    it('should convert an integer to a base58 string', async function () {
      assert.equal(utils.intToBase58(32454), 'aDy')
    })

    it('should fail if invalid format', async function () {
      try {
        utils.intToBase58('2322.12')
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58('something')
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58(24.36)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58([])
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('base58ToInt', async function () {

    it('should convert a base58 string to an integer', async function () {
      assert.equal(utils.base58ToInt('aDy'), 32454)
    })

    it('should fail if invalid format', async function () {
      try {
        let res = utils.base58ToInt('2322.12')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.base58ToInt('Yw==')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.base58ToInt(24.36)
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.base58ToInt([])
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('toExponentialString', async function () {

    it('should convert an integer to an exponential string', async function () {
      assert.equal(utils.toExponentialString(120000), '12e4')
    })

    it('should fail if invalid format', async function () {
      try {
        let res = utils.toExponentialString('2322.12')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.toExponentialString('Yw==')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.toExponentialString(24.36)
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.toExponentialString([])
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('fromExponentialString', async function () {

    it('should convert an integer to an exponential string', async function () {
      assert.equal(utils.fromExponentialString('12e4'), 120000)
    })

    it('should fail if invalid format', async function () {
      try {
        let res = utils.fromExponentialString('2322.12')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.fromExponentialString('Yw==')
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.fromExponentialString(24.36)
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        let res = utils.fromExponentialString([])
        assert.isNull(res)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })


})
