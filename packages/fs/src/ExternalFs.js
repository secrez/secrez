const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')

class ExternalFs {

  getNormalizedPath(file = '') {
    if (file === '~') {
      file = ''
    } else if (/^~\//.test(file)) {
      file = file.replace(/^~\//, '')
    }
    let resolvedFile = path.resolve(config.localWorkingDir, file)
    return path.normalize(resolvedFile)
  }

  async fileCompletion(options = {}) {
    if (typeof options === 'string') {
      options = {path: options}
    }
    let files = (await this.getDir(this.getNormalizedPath(options.path)))[1]
    return files.filter(f => {
      let pre = true
      if (options.dironly) {
        pre = /\/$/.test(f)
      } else if (options.fileonly) {
        pre = !/\/$/.test(f)
      }
      if (pre && !options.all) {
        pre = !/^\./.test(f)
      }
      return pre
    })
  }

  async mapDir(dir) {
    let list = await fs.readdir(dir)
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i] + ((await this.isDir(path.join(dir, list[i]))) ? '/' : '')
    }
    return list
  }

  async getDir(dir) {
    let list = []
    if (await this.isDir(dir)) {
      list = await this.mapDir(dir)
    } else {
      let fn = path.basename(dir)
      if (fn) {
        if (await this.isFile(dir)) {
          list = [fn]
        } else {
          dir = dir.replace(/\/[^/]+$/, '/')
          if (await this.isDir(dir)) {
            list = await this.mapDir(dir)
          }
          fn = '^' + fn.replace(/\?/g, '.{1}').replace(/\*/g, '.*') + '(|\\/)$'
          let re = RegExp(fn)
          list = list.filter(e => {
            return re.test(e)
          })
        }
      }
    }
    return [dir, list]
  }

  async isDir(dir) {
    if (await fs.pathExists(dir)) {
      return (await fs.lstat(dir)).isDirectory()
    }
    return false
  }

  async isFile(fn) {
    if (await fs.pathExists(fn)) {
      return (await fs.lstat(fn)).isFile()
    }
    return false
  }

}

module.exports = ExternalFs
