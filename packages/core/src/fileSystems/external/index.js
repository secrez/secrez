const _ = require('lodash')
const fs = require('../../utils/fs')
const path = require('path')
const config = require('../../config')

class ExternalFileSystem {

  getNormalizedPath(dir = '') {
    let resolvedDir = path.resolve(config.localWorkingDir, dir)
    let normalized = path.normalize(resolvedDir)
    return normalized
  }

  async fileCompletion(files = '', only) {
    let list = this.getDir(this.getNormalizedPath(files))
    if (only) {
      list = _.filter(list, f => {
        if (only === config.onlyDir) {
          return /\/$/.test(f)
        } else {
          return !/\/$/.test(f)
        }
      })
    }
    if (list.length) {
      let b = files === '/' ? ['./'] : ['./', '../']
      list = b.concat(list)
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
      dir = dir.replace(/\/[^/]+$/, '/')
      if (this.isDir(dir)) {
        list = this.mapDir(dir)
      }
    }
    return list
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
    let list = await this.fileCompletion(files)
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

  async pwd() {
    return config.localWorkingDir
  }

}

module.exports = ExternalFileSystem
