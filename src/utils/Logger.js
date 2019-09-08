const chalk = require('chalk')

let jsonIndent = 0

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

  static blue(str) {
    Logger.log('blue', str)
  }

  static cyan(str) {
    Logger.log('cyan', str)
  }

  static black(str) {
    Logger.log('black', str)
  }

  static bold(str) {
    Logger.log('bold', str)
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
  if (data[0] === 33) {
    jsonIndent = 2
    data = data.slice(1)
  } else {
    jsonIndent = 0
  }
  Logger.blue(data)
}



