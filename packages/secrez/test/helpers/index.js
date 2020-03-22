const chai = require('chai')
const assert = chai.assert

// const {Crypto, config, Entry} = require('@secrez/core')
// const {Node} = require('@secrez/fs')

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

  decolorize: (str) => {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '')
  },

  assertConsole: (inspect, message) => {
    let output = inspect.output.map(e => helpers.decolorize(e))
    if (output[0]) {
      output = output[0].split('\n')
      if (!Array.isArray(message)) {
        message = [message]
      }
      for (let i = 0; i < message.length; i++) {
        assert.equal(output[i], message[i])
      }
      return output
    } else {
      assert.isTrue(false)
    }
  }


}


module.exports = helpers
