const chai = require('chai')
const assert = chai.assert
const Command = require('../src/Command')
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('./mocks/PromptMock')
const {noPrint} = require('./helpers')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Command', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  let command
  let C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, './fixtures/files')
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
    command = new Command(prompt)
  })

  describe('#constructor', async function () {


    it('should instantiate a Command object', async function () {

      let command = new Command(prompt)
      assert.isTrue(Array.isArray(command.optionDefinitions))
    })

  })

  describe('#pseudoFileCompletion', async function () {

    it('should get the current folder dir', async function () {

      await noPrint(C.mkdir.exec({path: '/dir1'}))
      await noPrint(C.mkdir.exec({path: '/dir2'}))
      await noPrint(C.mkdir.exec({path: '/dir3'}))
      await noPrint(C.touch.exec({path: '/file1'}))
      await noPrint(C.touch.exec({path: '/file2'}))

      let pseudoFileCompletion = command.pseudoFileCompletion(C.ls, {})
      let dir = await pseudoFileCompletion({path: '.'})

      for (let p of ['dir1', 'dir2', 'dir3', 'file1', 'file2', '.trash']) {

        assert.isTrue(dir.includes(p))
      }
    })

  })

  describe('#fileCompletion', async function () {

    it('should get the current folder dir', async function () {

      let fileCompletion = command.fileCompletion(C.lls, {})
      let dir = await fileCompletion({path: 'folder1'})

      for (let p of ['folder2/', 'file1', 'file1.tar.gz', 'file2']) {
        assert.isTrue(dir.includes(p))
      }
    })

  })

})

