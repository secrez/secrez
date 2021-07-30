const {execAsync} = require('@secrez/utils')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')

class GitHelper {

  contructor(containerPath) {
    this.containerPath = containerPath
  }

  async isInstalled() {
    let res = await execAsync('which', __dirname, ['git'])
    if (!res.message || res.code === 1) {
      return false
    }
    return true
  }

  async isInitiated() {
    return await fs.pathExists(path.join(this.containerPath, '.git'))
  }

  async initRepo(mainBranch = 'main') {
    let res = (await execAsync('git', this.containerPath, ['init'])).message
    await execAsync('git', this.containerPath, ['add', '-A'])
    res += '\n' + (await execAsync('git', this.containerPath, ['commit', '-m', 'first-commit'])).message
    await execAsync('git', this.containerPath, ['branch', '-M', mainBranch])
    return res
  }

  async setMainBranch(mainBranch) {
    await execAsync('git', this.containerPath, ['branch', '-M', mainBranch])
  }

  async getRemoteUrl() {
    let res = await execAsync('git', this.containerPath, ['remote', '-v'])
    if (res.message && res.code !== 1) {
      for (let line of res.message.split('\n')) {
        if (/^origin/.test(line) && /\(push\)/.test(line)) {
          return line.replace(/origin\s+(.+)\s+\(push.+/, '$1')
        }
      }
    }
  }

  async setRemoteUrl(remoteUrl) {
    const existentRemoteUrl = await this.getRemoteUrl()
    if (existentRemoteUrl) {
      await execAsync('git', this.containerPath, ['remote', 'remove', 'origin'])
    }
    await execAsync('git', this.containerPath, ['remote', 'add', 'origin', remoteUrl])
  }

  async getActiveBranch() {
    let res = await execAsync('git', this.containerPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!res.message || res.code === 1) {
      return undefined
    }
    return _.trim(res.message)
  }

  async commitChanges(message = 'another-commit') {
    await execAsync('git', this.containerPath, ['add', '-A'])
    return (await execAsync('git', this.containerPath, ['commit', '-m', message])).message
  }

  async isRemoteRepoChanged(branch) {
    let res = await execAsync('git', this.containerPath, ['remote', '-v', 'update'])
    if (!res.message || res.code === 1) {
      throw new Error('Error checking for remote updates')
    }
    let message = (res.message + res.error).split('\n')
    for (let row of message) {
      if (/\[up to date\]/.test(row)) {
        row = row.split(']')[1].replace(/ +/g, ' ').split(' ')
        if (row[1] === branch) {
          return false
        }
      }
    }
    return true
  }

  async mustPull() {
    if (typeof this.mustBeChecked === 'undefined') {
      this.mustBeChecked = await this.isInstalled() && await this.isInitiated() && !!(await this.getRemoteUrl())
    }
    if (this.mustBeChecked) {
      return await this.isRemoteRepoChanged(await this.getActiveBranch())
    }
    return false
  }

}

module.exports = GitHelper
