const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {isYaml, yamlParse, yamlStringify, fromCsvToJson} = require('../../src/utils')

const {yml, yml2} = require('../fixtures')


describe  ('#utils', function () {

  let csvSample
  let jsonSample

  before(async function () {
    csvSample = await fs.readFile(path.resolve(__dirname, '../fixtures/some.csv'), 'utf8')
    jsonSample = require('../fixtures/some.json')
  })

  describe('fromCsvToJson', async function () {

    it('should convert a CSV file to an importable JSON file', async function () {

      const result = fromCsvToJson(csvSample)
      assert.equal(result.length, 5)
      assert.equal(Object.keys(result[0]).length, 6)
      assert.equal(result[0].login_name, 'Greg')
      assert.equal(result[1].comments.split('\n').length, 7)
      assert.equal(result[2].password, 'öäüÖÄÜß€@<>µ©®')

      for (let key in result[1]) {
        assert.equal(result[1][key], jsonSample[1][key])
      }

    })

    it('should throw if the CSV is bad', async function () {

      try {
        fromCsvToJson('path,"öäü",password\nssas,sasas,sasasa')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The header of the CSV looks wrong')
      }


      try {
        fromCsvToJson('path,"url{"sasa":3}",password\nssas,sasas,sasasa')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The CSV is malformed')
      }
    })

  })

  describe('isYaml', async function () {

    it('should return true if the file is a Yaml file', async function () {
      assert.isTrue(isYaml('fule.yml'))
      assert.isTrue(isYaml('fule.yaml'))
      assert.isTrue(isYaml('fule.YAML'))
      assert.isTrue(isYaml('fule.YmL'))
      assert.isFalse(isYaml('fule.txt'))

      assert.isFalse(isYaml(345))
    })

  })

  describe('yamlParse', async function () {

    it('should parse a Yaml string', async function () {
      assert.equal(yamlParse(yml2).pass, 'PASS')
      assert.isTrue(/-----END OPENSSH PRIVATE KEY-----/.test(yamlParse(yml).key))
    })

    it('should throw if the file is malformed', async function () {
      try {
        yamlParse('key:\nsasasasa\nsasas')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Cannot parse a malformed yaml')
      }
    })

  })

  describe('yamlStringify', async function () {

    it('should stringify a Javascript object to a Yaml string', async function () {
      assert.equal(yamlStringify({
        pass: 'PASS'
      }), 'pass: PASS\n')
    })

  })




})
