const chai = require('chai')
const assert = chai.assert
const Command = require('../src/Command')
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('./mocks/PromptMock')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Command', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  describe('#constructor', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      prompt = new Prompt
      await prompt.init(options)
      await prompt.secrez.signup(password, iterations)
      await prompt.internalFs.init()
    })

    it('should instantiate a Command object', async function () {

      let command = new Command(prompt)
      assert.isTrue(Array.isArray(command.optionDefinitions))
    })

  })

})

