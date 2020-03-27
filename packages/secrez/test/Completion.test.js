const chai = require('chai')
const assert = chai.assert
const Completion = require('../src/Completion')
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('./mocks/PromptMock')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Completion', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(rootDir)
    prompt = new Prompt
    await prompt.init(options)
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should instantiate a Completion object', async function () {

    let completion = new Completion(prompt)
    assert.isTrue(Array.isArray(completion.optionDefinitions))
  })

})

