const chai = require('chai')
const assert = chai.assert
const {isYaml, yamlParse, yamlStringify} = require('../../src/utils')

const yml = `key: |-
  -----BEGIN OPENSSH PRIVATE KEY-----
  jasjhdkajsdhasdhaskdhaskjdhdsjkfhkdsfhksfhdskjfhkdhaskdhaskdhaskdhasdj
  sdjdfdsfdjgdhjsdbcsdcnskdnafkjdsnfksandkasdnaknaskdnaskdnsadkasndasddk
  askjfsdhfksfhkjesdhakdaj=
  -----END OPENSSH PRIVATE KEY-----
password: sada8893qne238n9e23e3qec93`

const yml2 = 'pass: PASS\nkey: KEY'


describe('#utils', function () {

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
