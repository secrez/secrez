const chai = require('chai')
const assert = chai.assert
const utils = require('../src')
const path = require('path')
const fs = require('fs-extra')

const {yml, yml2} = require('./fixtures')

describe('#utils from core', function () {


  describe('capitalize', async function () {

    it('should capitalize a string', async function () {
      assert.equal(utils.capitalize('string'), 'String')
    })

    it('should throw if the parameter is not a string or it has zero length', function () {
      try {
        utils.capitalize(23)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Not a string')
      }

      try {
        utils.capitalize('')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Not a string')
      }
    })

  })

  describe('sortKeys', async function () {

    let obj = {
      a: 1,
      c: 2,
      b: 3
    }

    it('should sort an object or convert an array in sorted object', async function () {
      assert.equal(
          JSON.stringify(Object.keys(utils.sortKeys(obj))),
          '["a","b","c"]'
      )
    })

  })

  describe('sleep', async function () {

    it('should sleep for ~ 100 millisecond', async function () {
      let now = Date.now()
      await utils.sleep(100)
      let diff = Date.now() - now
      assert.isTrue(diff > 80 && diff < 120)
    })

    it('should not wait if the parameter is invalid', async function () {
      let now = Date.now()
      await utils.sleep(-100)
      let diff = Date.now() - now
      assert.isTrue(diff < 5)
      now = Date.now()
      await utils.sleep('some string')
      diff = Date.now() - now
      assert.isTrue(diff < 5)
    })

  })

  describe('isIp', async function () {

    it('should confirm 232.12.24.36 is a valid IP', async function () {
      assert.isTrue(utils.isIp('232.12.24.36'))
    })

    it('should fail if not ip or invalid format', async function () {
      assert.isFalse(utils.isIp('2322.12.24.36'))
      assert.isFalse(utils.isIp('232.12.24.36.23'))
      assert.isFalse(utils.isIp('24.36'))
      assert.isFalse(utils.isIp('232333336'))
    })

  })

  describe('intToBase58', async function () {

    it('should convert an integer to a base58 string', async function () {
      assert.equal(utils.intToBase58(32454), 'aDy')
      assert.equal(utils.intToBase58(32454, 10), '0000000aDy')
    })

    it('should fail if invalid format', async function () {
      try {
        utils.intToBase58('2322.12')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58('something')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58(24.36)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.intToBase58([])
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('base58ToInt', async function () {

    it('should convert a base58 string to an integer', async function () {
      assert.equal(utils.base58ToInt('aDy'), 32454)
    })

    it('should fail if invalid format', async function () {
      try {
        utils.base58ToInt('2322.12')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.base58ToInt('Yw==')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.base58ToInt(24.36)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.base58ToInt([])
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('toExponentialString', async function () {

    it('should convert an integer to an exponential string', async function () {
      assert.equal(utils.toExponentialString(120000), '12e4')
    })

    it('should fail if invalid format', async function () {
      try {
        utils.toExponentialString('2322.12')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.toExponentialString('Yw==')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.toExponentialString(24.36)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.toExponentialString([])
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('fromExponentialString', async function () {

    it('should convert an integer to an exponential string', async function () {
      assert.equal(utils.fromExponentialString('12e4'), 120000)
    })

    it('should fail if invalid format', async function () {
      try {
        utils.fromExponentialString('2322.12')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.fromExponentialString('Yw==')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.fromExponentialString(24.36)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
      try {
        utils.fromExponentialString([])
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid format')
      }
    })

  })

  describe('addTo', function () {

    let arr = ['a', 'b', 'c']

    it('should add data to an array', async function () {

      utils.addTo(arr, 2, 'x')
      utils.addTo(arr, 3, 'w')

      assert.equal(arr[2], 'cx')
      assert.equal(arr[3], 'w')

    })

    it('should throw if invalid parameters', async function () {
      try {
        utils.addTo(arr, -1, 'x')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid parameters')
      }
      try {
        utils.addTo(arr, null, 'x')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid parameters')
      }
      try {
        utils.addTo(arr, 2)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid parameters')
      }
      try {
        utils.addTo('casa', 2, 'x')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid parameters')
      }
    })
  })

  describe('#secureCompare', function () {

    it('should compare two equal strings', async function () {

      const a = 'verasals'
      const b = 'verasals'

      assert.isTrue(utils.secureCompare(a, b))

    })

    it('should compare two not equal, same-length strings', async function () {

      const a = 'verasals'
      const b = 'velsreds'

      assert.isFalse(utils.secureCompare(a, b))

    })

    it('should compare two not equal, not-same-length strings', async function () {

      const a = 'verasals'
      const b = 'veras'

      assert.isFalse(utils.secureCompare(a, b))

    })

    it('should compare two byte arrays', async function () {

      const a = [3, 54, 24, 132]
      const b = [3, 54, 24, 132]
      const c = [3, 54, 12, 132]
      const d = [3, 54, 12]

      assert.isTrue(utils.secureCompare(a, b))
      assert.isFalse(utils.secureCompare(a, c))
      assert.isFalse(utils.secureCompare(c, d))

    })

  })

  describe('#getKeyValue', async function () {

    it('should get key and value of an obj', async function () {
      let obj = { a: 'b'}
      let kv = utils.getKeyValue(obj, 'a')
      assert.equal(kv.key, 'a')
      assert.equal(kv.value, 'b')
    })

  })

  describe('#isBinary', async function () {

    it('should check if a file is binary', async function () {
      let fp = path.resolve(__dirname, './fixtures/qrcode.png')
      let dir = path.resolve(__dirname, './fixtures')
      assert.equal(await utils.isBinary(fp), true)
      assert.equal(await utils.isBinary(23), false)
      assert.equal(await utils.isBinary('somedir/'), false)
      assert.equal(await utils.isBinary(dir), false)
    })

  })

  describe('fromCsvToJson', async function () {

    let csvSample
    let jsonSample

    before(async function () {
      csvSample = await fs.readFile(path.resolve(__dirname, './fixtures/some.csv'), 'utf8')
      jsonSample = require('./fixtures/some.json')
    })

    it('should convert a CSV file to an importable JSON file', async function () {

      const result = utils.fromCsvToJson(csvSample)
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
        utils.fromCsvToJson('path,"öäü",password\nssas,sasas,sasasa')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The header of the CSV looks wrong')
      }


      try {
        utils.fromCsvToJson('path,"url{"sasa":3}",password\nssas,sasas,sasasa')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'The CSV is malformed')
      }
    })

  })

  describe('isYaml', async function () {

    it('should return true if the file is a Yaml file', async function () {
      assert.isTrue(utils.isYaml('fule.yml'))
      assert.isTrue(utils.isYaml('fule.yaml'))
      assert.isTrue(utils.isYaml('fule.YAML'))
      assert.isTrue(utils.isYaml('fule.YmL'))
      assert.isFalse(utils.isYaml('fule.txt'))

      assert.isFalse(utils.isYaml(345))
    })

  })

  describe('yamlParse', async function () {

    it('should parse a Yaml string', async function () {
      assert.equal(utils.yamlParse(yml2).pass, 'PASS')
      assert.isTrue(/-----END OPENSSH PRIVATE KEY-----/.test(utils.yamlParse(yml).key))
    })

    it('should throw if the file is malformed', async function () {
      try {
        utils.yamlParse('key:\nsasasasa\nsasas')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Cannot parse a malformed yaml')
      }
    })

  })

  describe('yamlStringify', async function () {

    it('should stringify a Javascript object to a Yaml string', async function () {
      assert.equal(utils.yamlStringify({
        pass: 'PASS'
      }), 'pass: PASS\n')
    })

  })

  describe('TRUE', async function () {

    it('should return true', async function () {
      assert.equal(utils.TRUE(), true)
    })

  })

  describe('removeNotPrintableChars', async function () {

    it('should remove unprintable chars', async function () {
      assert.equal(utils.removeNotPrintableChars('hello\x00 world\x08'), 'hello world')
    })

  })


  describe('getCols', async function () {

    it('should return 80', async function () {
      assert.equal(utils.getCols(), 80)
    })

  })

  describe('fromSimpleYamlToJson', async function () {

    it('should convert a simple yml file to json', async function () {
      let json = utils.fromSimpleYamlToJson(`user: ciccio
password: s8s8s8s
email: some@example.com`)
      assert.equal(json.password, 's8s8s8s')
    })

  })

  describe('execAsync', async function () {

    it('should execute a command', async function () {
      let dir = path.resolve(__dirname, './fixtures/files')
      let result = await utils.execAsync('cat', dir, ['file0.txt'])
      assert.equal(result.message, 'Three secrets')
    })

    it('should throw if errors', async function () {
      let dir = path.resolve(__dirname, './fixtures/files')
      let result = await utils.execAsync('cat', dir, ['file4.txt'])
      assert.equal(result.error, 'cat: file4.txt: No such file or directory')

    })

  })

})
