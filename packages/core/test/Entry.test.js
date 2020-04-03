const chai = require('chai')
const assert = chai.assert
const Entry = require('../src/Entry')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Entry', function () {

  describe('#constructor', async function () {

    it('should instantiate the Entry', async function () {

      let entry = new Entry({
        name: 'Name'
      })
      assert.equal(entry.get(['name']).name, 'Name')

    })

    it('should ignore wrong parameters', async function () {

      let entry = new Entry({
        gender: 'male'
      })
      assert.equal(entry.get([]).gender, undefined)

    })

  })


  describe('#set', async function () {

    it('should set some options for the Entry', async function () {

      let entry = new Entry({
        name: 'Name'
      })
      entry.set({
        id: '123'
      })
      assert.equal(entry.get().id, '123')

    })

    it('should skip invalid options', async function () {

      let entry = new Entry({
        name: 'Name'
      })
      entry.set({
        gender: 'male'
      })
      assert.equal(entry.get().male, undefined)

    })

  })

  describe('#unset', async function () {

    it('should unset some options', async function () {

      let entry = new Entry({
        name: 'Name',
        id: '123',
        type: 1,
        content: 'Content'
      })
      entry.unset('id')
      entry.unset(['type','content'])
      assert.equal(Object.keys(entry.get()).length, 1)

    })

    it('should skip invalid or undefined options', async function () {

      let entry = new Entry({
        name: 'Name'
      })
      entry.unset('id')
      entry.unset('gender')
      assert.equal(Object.keys(entry.get()).length, 1)

    })

  })


  describe('#sanitizeName', async function () {

    it('should sanitize names', async function () {

      let name = 'a<}>b'
      assert.equal(Entry.sanitizeName(name), 'a}b')

      // eslint-disable-next-line no-useless-escape
      name = 'XX\\\ ;|:C_'
      assert.equal(Entry.sanitizeName(name), 'XX ;C_')

    })

  })


})
