const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')

const Config = require('../src/Config')

describe('#Config', function () {

  let root = path.resolve(__dirname, '../tmp/test/config')
  let config

  beforeEach(async function () {
    await fs.emptyDir(root)
  })

  describe('#constructor', async function () {

    it('should setup the environment', async function () {
      config = new Config({root})
      assert.equal(config.options.root, root)
      assert.isTrue(await fs.pathExists(path.join(root, 'certs')))
      assert.isTrue(await fs.pathExists(path.join(root, 'data')))

    })

    it('should throw if passing wrong params', async function () {

      try {
        new Config()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'You are not supposed to test @secrez/courier in the default folder. This can lead to mistakes and loss of data.')
      }

      try {
        new Config({root: '/'})
        assert.isFalse(true)
      } catch (e) {
        assert.isTrue(!!e.message)
      }

    })


  })

})
