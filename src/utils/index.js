const path = require('path')
const homedir = require('homedir')
const _ = require('lodash')

const Base58 = require('base58')

class Utils {

  static capitalize(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase()
  }

  static normalizeIp(ip) {
    if (!ip) {
      ip = '(not-running)'
    }
    return ip + ' '.repeat(15 - ip.length)
  }

  static normalizePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath
    } else if (/^~\//.test(filePath)) {
      return filePath.replace(/^~/, homedir())
    } else {
      let root = path.resolve(__dirname, '../..')
      return path.resolve(root, filePath)
    }
  }

  static sortKeys(obj) {
    return _(obj).toPairs().sortBy(0).fromPairs().value()
  }

  static sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis))
  }

  static isIp(ip) {
    return /\b(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b/.test('' + ip)
  }

  static intToBase58(v) {
    return Base58.int_to_base58(v)
  }

  static base58ToInt(v) {
    return Base58.base58_to_int(v)
  }

  static toExponentialString(num) {
    num = `${num}`
    let str = num.replace(/0+$/, '')
    return str + 'e' + (num.length - str.length)
  }

  static fromExponentialString(str) {
    str = str.split('e')
    return parseInt(str[0] + '0'.repeat(parseInt(str[1])))
  }

}

module.exports = Utils



