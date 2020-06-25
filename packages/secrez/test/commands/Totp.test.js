const chai = require('chai')
const assert = chai.assert
const stdout = require('test-console').stdout
const clipboardy = require('clipboardy')
const fs = require('fs-extra')
const path = require('path')

const Prompt = require('../mocks/PromptMock')
const {sleep, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Totp', function () {

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
    await C.totp.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should totp a file to the clipboard', async function () {

    let content = 'totp: sheurytwrefd'
    let p = '/card.yml'
    await noPrint(C.touch.exec({
      path: p,
      content
    }))

    let previousContent = await clipboardy.read()

    inspect = stdout.inspect()
    await C.totp.exec({
      path: 'card.yml',
      duration: [0.2]
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/TOTP token: \d{6}/.test(output[0]))
    let token = output[0].split('TOTP token: ')[1]

    await sleep(100)
    assert.equal(await clipboardy.read(), token)

    await sleep(200)
    assert.equal(await clipboardy.read(), previousContent)

  })


})

