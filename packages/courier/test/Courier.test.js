const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')

const Courier = require('../src/Courier')
const Server = require('../src/Server')

describe('#Courier', function () {

  let root = path.resolve(__dirname, '../tmp/test/.secrez-courier')

  beforeEach(async function () {
    await fs.emptyDir(root)
  })

  describe('#constructor', async function () {


    it('should setup the environment', async function () {

      let courier = new Courier({root})
      assert.equal(courier.config.options.root, root)
      assert.isTrue(courier.server instanceof Server)

    })

  })

})
