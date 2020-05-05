const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

let jsonIndent = 0


chalk.blu = str => {
  return chalk.rgb(40, 160, 210).dim(str)
}

chalk.agua = str => {
  return chalk.rgb(40, 210, 160).dim(str)
}

class Logger {

  static red(str) {
    Logger.log('red', str)
  }

  static redWithSuggestion(str) {
    Logger.log('red', `${str}\n>>`, 'grey', 'Press TAB for suggestions.')
  }

  static yellow(str) {
    Logger.log('yellow', str)
  }

  static grey(str) {
    Logger.log('grey', str)
  }

  static green(str) {
    Logger.log('green', str)
  }

  static agua(str) {
    Logger.log('agua', str)
  }

  static blue(str) {
    Logger.log('blue', str)
  }

  static cyan(str) {
    Logger.log('cyan', str)
  }

  static dim(str) {
    Logger.log('dim', str)
  }

  static reset(str) {
    Logger.log('reset', str)
  }

  static bold(str) {
    Logger.log('bold', str)
  }

  static blu(str) {
    Logger.log('blu', str)
  }

  static format(data) {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, jsonIndent)
    } else {
      return data
    }
  }

  static log(...data) {
    let message = ''
    let prev
    if (data.length === 1) {
      data = ['dim', data[0]]
    }
    for (let i = 0; i < data.length; i += 2) {
      if (typeof data[i + 1] === 'undefined') {
        break
      }
      let sep = prev ? ' ' : ''
      data[i + 1] = Logger.format(data[i + 1])
      if (prev && ['bold', 'italic', 'dim', 'underline'].includes(data[i])) {
        message += sep + chalk[prev][data[i] || 'reset'](data[i + 1])
      } else {
        message += sep + chalk[data[i] || 'reset'](data[i + 1])
      }
      prev = data[i]
    }
    console.info(message)
  }

}

module.exports = Logger
module.exports.debug = (...data) => {
  fs.appendFileSync(path.resolve(__dirname, '../../tmp/tmp.log'), '\n' + data.join(' '))
}

module.exports.chalk = chalk



