const _ = require('lodash')
const path = require('path')
const commandLineArgs = require('command-line-args')

class FileSystemsUtils {

  static preParseCommandLine(commandLine) {
    let argv = []
    let k = 0
    let sep
    commandLine = _.trim(commandLine)
    for (let i = 0; i < commandLine.length; i++) {
      let c = commandLine[i]
      if (!sep && /("|')/.test(c)) {
        sep = c
      } else if (sep && c === sep) {
        sep = null
      } else if (!sep && c === '\\' && commandLine[i + 1]) {
        if (!argv[k]) argv[k] = ''
        argv[k] += commandLine[i + 1]
        i++
      } else if (!sep && c === ' ') {
        k++
      } else {
        if (!argv[k]) argv[k] = ''
        argv[k] += c
      }
    }
    return argv
  }

  static parseCommandLine(definitions, commandLine, onlyIfDefinitions) {
    if (definitions && commandLine) {
      const argv = this.preParseCommandLine(commandLine)
      return commandLineArgs(definitions, {argv})
    } else if (definitions && !onlyIfDefinitions) {
      return commandLineArgs(definitions)
    }
    return {}
  }

  static async filterLs(files, folderList) {
    let bn = files ? path.basename(files) : ''
    let [folder, list] = folderList
    if (bn && list.includes(bn)) {
      return [bn]
    } else if (bn) {
      if (/\*/.test(bn)) {
        bn = bn.replace(/\*/g, '.*')
        let re = RegExp(bn)
        list = _.filter(list, e => re.test(e))
      } else {
        list = []
      }
    }
    return list.map(f => {
      f = f.split('/')
      let l = f.length - 1
      if (f[l]) {
        return f[l]
      } else {
        return f[l - 1] + '/'
      }
    })
  }

}

module.exports = FileSystemsUtils
