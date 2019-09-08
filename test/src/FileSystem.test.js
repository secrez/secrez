const path = require('path')
const assert = require('assert')
const FileSystem = require('../../src/FileSystem')

describe('#FileSystem', function () {

  let fileSystem = new FileSystem()


  describe('#getAllDirs', async function() {

    it('should read the tree of the directories and decrypt them', async function () {

      console.log(await fileSystem.getAllDirs('/Users/sullof/Projects/Personal/secrez-node/src'))

    })

  })



})
