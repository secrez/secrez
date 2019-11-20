const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const {config} = require('@secrez/core')
const FileSystemsUtils = require('./FileSystemsUtils')


class ExternalFs {

  getNormalizedPath(dir = '') {
    if (dir === '~') {
      dir = ''
    } else if (/^~\//.test(dir)) {
      dir = dir.replace(/^~\//, '')
    }
    let resolvedDir = path.resolve(config.secrez.localWorkingDir, dir)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  async fileCompletion(files = '', only) {
    let list = this.getDir(this.getNormalizedPath(files))[1]
    if (only) {
      list = _.filter(list, f => {
        if (only === config.onlyDir) {
          return /\/$/.test(f)
        } else {
          return !/\/$/.test(f)
        }
      })
    }
    return list
  }

  mapDir(dir) {
    return fs.readdirSync(dir).map(e => e + (this.isDir(path.join(dir, e)) ? '/' : ''))
  }

  getDir(dir) {
    let list = []
    if (this.isDir(dir)) {
      list = this.mapDir(dir)
    } else {
      let fn = path.basename(dir)
      if (fn) {
        dir = dir.replace(/\/[^/]+$/, '/')
        if (this.isDir(dir)) {
          list = this.mapDir(dir)
        }
        let ok = false
        for (let e of list) {
          if (e.indexOf(fn) === 0) {
            ok = true
            break
          }
        }
        if (!ok) list = []
      }
    }
    return [dir, list]
  }

  isDir(dir) {
    if (fs.existsSync(dir)) {
      return fs.lstatSync(dir).isDirectory()
    }
    return false
  }

  isFile(fn) {
    if (fs.existsSync(fn)) {
      return fs.lstatSync(fn).isFile()
    }
    return false
  }

  async cd(dir) {
    if (!this.initialLocalWorkingDir) {
      this.initialLocalWorkingDir = config.secrez.localWorkingDir
    }
    if (/^~\//.test(dir) || dir === '~') {
      dir = dir.replace(/^~/, this.initialLocalWorkingDir)
    }
    dir = this.getNormalizedPath(dir)
    if (this.isDir(dir)) {
      config.secrez.localWorkingDir = dir
    } else {
      throw new Error('No such directory')
    }
  }

  async ls(files) {
    return FileSystemsUtils.filterLs(files, await this.fileCompletion(files))
  }

  async pwd() {
    return config.secrez.localWorkingDir
  }

}

module.exports = ExternalFs
