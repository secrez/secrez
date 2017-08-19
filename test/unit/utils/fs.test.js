'use strict'

/* globals Promise */

const assert = require('assert')
const fs = require('../../../src/utils/fs')

describe('fs', function () {

  it('should return true if a directory exists', () => {

    assert(fs.existsDir(__dirname))
    return Promise.resolve()
  })

  it('should return false if a directory does not exist', () => {

    assert(fs.existsDir('/some-random/directory/whichDoesNotExist') === false)
    return Promise.resolve()
  })

})