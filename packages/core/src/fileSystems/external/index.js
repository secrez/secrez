const _ = require('lodash')
const fs = require('../../utils/fs')
const path = require('path')
const config = require('../../config')
const FileSystemsUtils = require('../FileSystemsUtils')


class ExternalFileSystem {

  getNormalizedPath(dir = '') {
    let resolvedDir = path.resolve(config.localWorkingDir, dir)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  async fileCompletion(files = '', only) {
    let [folder, list] = this.getDir(this.getNormalizedPath(files))
    if (only) {
      list = _.filter(list, f => {
        if (only === config.onlyDir) {
          return /\/$/.test(f)
        } else {
          return !/\/$/.test(f)
        }
      })
    }
    return [folder, list]
  }

  mapDir(dir) {
    return fs.readdirSync(dir).map(e => e + (this.isDir(path.join(dir, e)) ? '/' : ''))
  }

  getDir(dir) {
    let list = []
    if (this.isDir(dir)) {
      list = this.mapDir(dir)
    } else {
      dir = dir.replace(/\/[^/]+$/, '/')
      if (this.isDir(dir)) {
        list = this.mapDir(dir)
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
    let dirPath = this.realPath(fn)
    if (fs.existsSync(dirPath)) {
      return fs.lstatSync(dirPath).isFile()
    }
    return false
  }

  async cd(dir) {
    dir = this.getNormalizedPath(dir)
    if (this.isDir(dir)) {
      config.localWorkingDir = dir
    } else {
      throw new Error('No such directory')
    }
  }

  async ls(files) {
    return FileSystemsUtils.filterLs(files, await this.fileCompletion(files))
  }

  async pwd() {
    return config.localWorkingDir
  }

}

module.exports = ExternalFileSystem
