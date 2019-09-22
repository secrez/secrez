const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const Secrez = require('../../../src/Secrez')
const InternalFs = require('../../../src/fileSystems/InternalFs')

describe('#InternalFs', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')

  before(async function () {
    await fs.emptyDir(rootDir)
    secrez = new Secrez()
    await secrez.init(rootDir)
  })

  // describe('preParseCommandLine', async function () {
  //
  //   let commandLine
  //   let parsed
  //
  //   it('should preParse a command line', async function () {
  //     commandLine = 'ls -l ~/data/bit'
  //     parsed = utils.preParseCommandLine(commandLine)
  //     assert.equal(JSON.stringify(parsed), '["ls","-l","~/data/bit"]')
  //
  //     commandLine = 'ls --list *'
  //     parsed = utils.preParseCommandLine(commandLine)
  //     assert.equal(JSON.stringify(parsed), '["ls","--list","*"]')
  //   })
  //
  //   it('should preParse a command line with escaped pars', async function () {
  //     commandLine = 'ls casa\\ secca'
  //     parsed = utils.preParseCommandLine(commandLine)
  //     assert.equal(JSON.stringify(parsed), '["ls","casa secca"]')
  //   })
  //
  //   it('should preParse a command line using quotes for params', async function () {
  //     commandLine = 'ls "casa secca"'
  //     parsed = utils.preParseCommandLine(commandLine)
  //     assert.equal(JSON.stringify(parsed), '["ls","casa secca"]')
  //   })
  //
  // })
  //
  // describe('parseCommandLine', async function () {
  //
  //   let commandLine
  //   let options
  //   let definitions = [
  //     {
  //       name: 'content',
  //       alias: 'c',
  //       type: String
  //     },
  //     {
  //       name: 'path',
  //       alias: 'p',
  //       defaultOption: true,
  //       type: String
  //     }
  //   ]
  //
  //   it('should parse a command line with definitions', async function () {
  //     commandLine = '-c "lupa rossa" -p ~/rossa'
  //     options = utils.parseCommandLine(definitions, commandLine)
  //
  //     assert.equal(JSON.stringify(options), '{"content":"lupa rossa","path":"~/rossa"}')
  //
  //   })
  //
  // })
})
