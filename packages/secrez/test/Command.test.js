const chai = require('chai')
const assert = chai.assert
const Command = require('../src/Command')
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('./mocks/PromptMock')
const {noPrint, decolorize} = require('./helpers')

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

  describe('#getFileList', async function () {

    it('should get the current internal folder dir', async function () {

      await noPrint(C.mkdir.exec({path: '/dir1'}))
      await noPrint(C.mkdir.exec({path: '/dir2'}))
      await noPrint(C.touch.exec({path: '/dir3/file3'}))
      await noPrint(C.touch.exec({path: '/file1'}))
      await noPrint(C.touch.exec({path: '/file2'}))

      let pseudoFileCompletion = command.selfCompletion(C.ls, {})
      let dir = await pseudoFileCompletion({path: '.'}, '', 'path')
      assert.equal(dir.sort().join(' '),'dir1/ dir2/ dir3/ file1 file2 main trash')

      dir = await pseudoFileCompletion({path: null}, '', 'path')
      assert.equal(dir.sort().join(' '),'dir1/ dir2/ dir3/ file1 file2 main trash')

      dir = await pseudoFileCompletion({path: '/dir3'}, '', 'path')
      assert.equal(dir.sort().join(' '),'file3')

      dir = await pseudoFileCompletion({path: '/dir3'}, '', 'dest')
      assert.equal(dir.sort().join(' '),'')

    })

    it('should get the current external folder dir', async function () {

      let fileCompletion = command.selfCompletion(C.lls, {external: true})
      let dir = await fileCompletion({path: 'folder1'}, '', 'path')
      for (let p of ['file$2', 'file1', 'file1.tar.gz', 'folder2/', 'folder3/']) {
        assert.isTrue(dir.includes(p))
      }

    })

  })

  describe('#help & #setHelpAndCompletion', async function () {

    it('should do nothing', async function () {

      assert.isUndefined(command.help())
      assert.isUndefined(command.setHelpAndCompletion())
    })

  })

  describe('#validate', async function () {

    it('should validate the options', async function () {

      const options = {
        path: '/file'
      }

      assert.equal(command.validate(options), undefined)
      assert.equal(command.validate(options,{
        path: true
      }), undefined)

      try {
        command.validate(options, {
          file: true,
          destination: true
        })
        assert.isTrue(false)
      } catch(e) {
        assert.equal(decolorize(e.message), 'Missing options: file, destination')
      }

      options._unknown = '-w'

      try {
        command.validate(options)
        assert.isTrue(false)
      } catch(e) {
        assert.equal(decolorize(e.message), `Unknown option: ${options._unknown} (run "command -h" for help)`)
      }

    })

  })

})

