const assert = require('chai').assert

const fs = require('fs-extra')
const path = require('path')
const Prompt = require('../mocks/PromptMock')
const {noPrint} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Create', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let C

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should create a file', async function () {

    await noPrint(C.create.exec({path: '/file1', content: 'Some content'}))
    let file1 = prompt.internalFs.tree.root.getChildFromPath('/file1')
    assert.equal(file1.getContent(), 'Some content')
  })

})

