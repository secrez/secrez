const _ = require('lodash')

const Base58 = require('base58')

class Utils {

  static capitalize(str) {
    if (typeof str === 'string' && str.length > 0) {
      return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase()
    } else {
      throw new Error('Not a string')
    }
  }

  static sortKeys(obj) {
    return _(obj).toPairs().sortBy(0).fromPairs().value()
  }

  static sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis))
  }

  static isIp(ip) {
    return /^\b(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b$/.test('' + ip)
  }

  static intToBase58(v) {
    try {
      if (typeof v === 'number') {
        return Base58.int_to_base58(v)
      } else throw new Error()
    } catch (e) {
      throw new Error('Invalid format')
    }
  }

  static base58ToInt(v) {
    try {
      return Base58.base58_to_int(v)
    } catch (e) {
      throw new Error('Invalid format')
    }

  }

  static toExponentialString(num) {
    try {
      num = `${num}`
      if (parseInt(num).toString() !== num) {
        throw new Error()
      }
      let str = num.replace(/0+$/, '')
      return str + 'e' + (num.length - str.length)
    } catch (e) {
      throw new Error('Invalid format')
    }

  }

  static fromExponentialString(str) {
    try {
      str = `${str}`.split('e')
      if (str.length === 2) {
        return parseInt(str[0] + '0'.repeat(parseInt(str[1])))
      } else {
        throw new Error()
      }
    } catch (e) {
      throw new Error('Invalid format')
    }

  }

  static addTo(arr, index, data) {
    if (Array.isArray(arr) && typeof index === 'number' && index >= 0 && parseInt(index) === index && data) {
      if (!arr[index]) arr[index] = ''
      arr[index] += data
    } else {
      throw new Error('Invalid parameters')
    }
  }

  static secureCompare(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false
    }
    let match = true
    for (let i = 0; i < a.length; i++) {
      match = match && (a[i] === b[i])
    }
    return match
  }

}

module.exports = Utils



