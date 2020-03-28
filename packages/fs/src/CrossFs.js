const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')
const FsUtils = require('./FsUtils')

class CrossFs {

  constructor(internalFs, externalFs) {
    this.internalFs = internalFs
    this.externalFs = externalFs
  }

}

module.exports = CrossFs
