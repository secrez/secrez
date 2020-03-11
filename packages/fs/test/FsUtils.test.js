const chai = require('chai')
const assert = chai.assert
const utils = require('../src/FsUtils')

describe('#FsUtils', function () {


  describe('preParseCommandLine', async function () {

    let commandLine
    let parsed

    it('should preParse a command line', async function () {
      commandLine = 'ls -l ~/data/bit'
      parsed = utils.preParseCommandLine(commandLine)
      assert.equal(JSON.stringify(parsed), '["ls","-l","~/data/bit"]')

      commandLine = 'ls --list *'
      parsed = utils.preParseCommandLine(commandLine)
      assert.equal(JSON.stringify(parsed), '["ls","--list","*"]')
    })

    it('should preParse a command line with escaped pars', async function () {
      commandLine = 'ls casa\\ secca'
      parsed = utils.preParseCommandLine(commandLine)
      assert.equal(JSON.stringify(parsed), '["ls","casa secca"]')
    })

    it('should preParse a command line using quotes for params', async function () {
      commandLine = 'ls "casa secca"'
      parsed = utils.preParseCommandLine(commandLine)
      assert.equal(JSON.stringify(parsed), '["ls","casa secca"]')
    })

  })

  describe('parseCommandLine', async function () {

    let commandLine
    let options
    let definitions = [
      {
        name: 'content',
        alias: 'c',
        type: String
      },
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      }
    ]

    it('should parse a command line with definitions', async function () {
      commandLine = '-c "lupa rossa" -p ~/rossa'
      options = utils.parseCommandLine(definitions, commandLine)

      assert.equal(JSON.stringify(options), '{"content":"lupa rossa","path":"~/rossa"}')

    })

    it('should return a {} w/out definitions', async function () {
      options = utils.parseCommandLine()
      assert.equal(JSON.stringify(options), '{}')

    })

    it('should return a {} w/out params', async function () {
      // it uses process.argv []
      definitions = [
        {
          name: 'files',
          defaultOption: true,
          multiple: true
        },
        {
          name: 'exit',
          type: Boolean
        }
      ]
      options = utils.parseCommandLine(definitions)
      assert.isTrue(options.files.length >= 4)
    })

    it('should throw if unknown option is passed', async function () {
      commandLine = '-a -p ~/rossa'
      try {
        options = utils.parseCommandLine(definitions, commandLine)
        assert.isFalse(true)
      } catch (e) {
        assert.isTrue(/unknown option/i.test(e.message))
      }
    })

  })

  describe('filterLs', async function () {

    let list = [
      'test.log',
      'cards/',
      'test2.log',
      'values/',
      'some.log'
    ]
    let filtered

    it('should filter an array of files and return itself', async function () {

      filtered = await utils.filterLs('some/path/test.log', list)
      assert.equal(filtered.length, 1)
      assert.equal(filtered[0], 'test.log')

    })

    it('should filter an array of files starting from "te"', async function () {

      filtered = await utils.filterLs('te*', list)
      assert.equal(filtered.length, 2)
      assert.equal(filtered[1], 'test2.log')

    })

    it('should filter an array of files of type .log', async function () {

      filtered = await utils.filterLs('*.log', list)
      assert.equal(filtered.length, 3)
      assert.equal(filtered[2], 'some.log')

    })

    it('should filter an array of files and find the folders', async function () {

      filtered = await utils.filterLs('cards', list)
      assert.equal(filtered.length, 1)
      assert.equal(filtered[0], 'cards/')

    })

    it('should return an empty array if nothing is found', async function () {

      filtered = await utils.filterLs('*.rad', list)
      assert.equal(filtered.length, 0)

    })

    it('should return an empty array if parameters are missed or empty', async function () {

      filtered = await utils.filterLs('*.log')
      assert.equal(filtered.length, 0)

      // eslint-disable-next-line require-atomic-updates
      filtered = await utils.filterLs()
      assert.equal(filtered.length, 0)

    })

    it('should return all the list array if files are missed', async function () {

      filtered = await utils.filterLs(null, list)
      assert.equal(filtered.length, 5)

    })

  })

  describe('#ls', async function () {

    it('should list the content of a folder', async function () {

    })

  })


})
