const chai = require('chai')
const assert = chai.assert
const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')
const stdout = require('test-console').stdout
const {execAsync} = require('../../src/utils')

const helpers = {

  jsonEqual: (j, k) => {


    if (j.id !== k.id) return false
    if (j.v.length !== k.v.length) return false
    if (j.v) {
      j.v.sort()
      k.v.sort()
      for (let i = 0; i < j.v.length; i++) {
        if (j.v[i] !== k.v[i]) return false
      }
    }
    if ((j.c || k.c) && j.c.length !== k.c.length) return false
    if (j.c) {
      const s = (a, b) => {
        let A = a.v.sort()[0]
        let B = b.v.sort()[0]
        return A > B ? 1 : A < B ? -1 : 0
      }
      j.c.sort(s)
      k.c.sort(s)
      for (let i = 0; i < j.c.length; i++) {
        if (!helpers.jsonEqual(j.c[i], k.c[i])) return false
      }
    }

    return true

  },

  decolorize: (str, inspect) => {
    if (inspect) {
      console.info(inspect.output.map(e => helpers.decolorize(e)))
    } else {
      // eslint-disable-next-line no-control-regex
      return _.trim(str.replace(/\x1b\[[0-9;]*m/g, ''))
    }
  },

  assertConsole: (inspect, message, includes) => {
    let output = inspect.output.map(e => helpers.decolorize(e))
    let result = []
    for (let o of output) {
      o = o.split('\n')
      for (let i of o) {
        if (i) {
          result.push(_.trim(i))
        }
      }
    }
    if (!Array.isArray(message)) {
      message = [message]
    }
    message = message.map(e => helpers.decolorize(e))
    for (let i = 0; i < message.length; i++) {
      if (includes) {
        assert.isTrue(RegExp(message[i]).test(result[i]))
      } else {
        assert.equal(result[i], message[i])
      }
    }
    return output
  },

  sleep: millis => {
    return new Promise(resolve => setTimeout(resolve, millis))
  },

  async noPrint(func) {
    let inspect = stdout.inspect()
    let ret = await func
    inspect.restore()
    return ret
  },

  async copyImageToClipboard(image) {
    let result
    let p
    switch (process.platform) {
      case 'darwin':
        p = path.resolve(__dirname, 'os/build/impbcopy')
        if (!(await fs.pathExists(p))) {
          throw new Error('Please build the helpers, running "npm run build-helpers')
        }
        result = await execAsync(p, __dirname, [image])
        if (result.error) {
          throw new Error(result.error)
        }

        break
      case 'win32':
        throw new Error('Operation not supported on Windows')
      default:
        result = await execAsync('which', __dirname, ['xclip'])
        if (result.code === 1) {
          throw new Error('xclip is required. On Debian/Ubuntu you can install it with "sudo apt install xclip"')
        }
        result = await execAsync('xclip', __dirname, ['-selection', ' clipboard', '-t', 'image/png', '-i', image])
        if (result.error) {
          throw new Error(result.error)
        }
    }
  }

}


module.exports = helpers
