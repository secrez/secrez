const stdout = require('test-console').stdout
const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../src/prompts/Prompt')
const MainPrompt = require('./mocks/MainPromptMock')
const {assertConsole, noPrint, decolorize} = require('@secrez/test-helpers')

describe('#Migration', function () {

  const password = 'c'
  const iterations = 1e3

  let prompt
  let testDir = path.resolve(__dirname, '../../tmp/test')
  let container = path.join(testDir, 'secrez-10')

  let options = {
    container
  }

  beforeEach(async function () {
    await fs.emptyDir(testDir)
    await fs.copy(path.resolve(__dirname, 'fixtures/secrez-10'), container)
  })

  it('should migrate a db and verify that the two are the same', async function () {

    prompt = new MainPrompt
    await prompt.init(options)
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()




  })



})

