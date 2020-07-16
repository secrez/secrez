const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const clipboardy = require('clipboardy')
const fs = require('fs-extra')
const path = require('path')

const {yamlParse} = require('../../src/utils')
const Prompt = require('../mocks/PromptMock')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Paste', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, '../../tmp/test')
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new Prompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()
  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.paste.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should paste the clipboard content to a new file', async function () {

    let content = 'Some secret'
    await clipboardy.write(content)

    inspect = stdout.inspect()
    await C.paste.exec({
      path: 'file'
    })
    inspect.restore()
    assertConsole(inspect, ['Pasted the clipboard to:', 'file'])

    assert.equal((await C.cat.cat({path: 'file'}))[0].content, content)
    assert.equal(await clipboardy.read(), '')

  })

  it('should paste the clipboard content to an existent file', async function () {

    let p = 'some/path'
    let content = 'Some secret'
    await noPrint(
        C.touch.exec({
      path: p,
      content
    }))

    let newContent = 'New secret'
    await clipboardy.write(newContent)
    await noPrint(C.paste.exec({
      path: p
    }))

    assert.equal((await C.cat.cat({path: p}))[0].content, newContent)

    let addedContent = 'Added secret'
    await clipboardy.write(addedContent)
    await noPrint(C.paste.exec({
      path: p,
      append: true
    }))

    assert.equal((await C.cat.cat({path: p}))[0].content, newContent + '\n' + addedContent)

  })

  it('should paste a single field to a yml card', async function () {

    let p = 'card.yml'
    let username = 'john'
    let content = `username: ${username}`
    await noPrint(
        C.touch.exec({
          path: p,
          content
        }))

    let password = '7sy3ge5stwg3'
    await clipboardy.write(password)
    await noPrint(C.paste.exec({
      path: p,
      field: 'password'
    }))

    let data = (await C.cat.cat({path: p, unformatted: true}))[0].content
    data = yamlParse(data)
    assert.equal(data.username, username)
    assert.equal(data.password, password)

  })

})

