const {execSync} = require('child_process')
const {execAsync} = require('@secrez/utils')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')

class Git extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.git = {
      _self: this
    }
    this.cliConfig.completion.help.git = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'push',
        type: Boolean
      },
      {
        name: 'pull',
        type: Boolean
      },
      {
        name: 'info',
        alias: 'i',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Pushes to a repo and pulls from a repo.', 'The repo must be set up outside secrez!'],
      examples: [
        ['git --push', 'adds, commits and pushes to the remote repo; a message is not allowed because it is better not to give any help to a possible hacker about whatever you are committing'],
        ['git --pull', 'pulls from origin and merges'],
        ['git --info', 'get info about the repo, like the remote url']
      ]
    }
  }

  async git(options) {
    let containerPath = this.secrez.config.container
    if (!(await fs.pathExists(path.join(containerPath, '.git')))) {
      throw new Error('Git repo not found')
    }
    let result = await execAsync('git', containerPath, ['remote', '-v'])
    if (!result.message || result.code === 1) {
      throw new Error('No remote origin found')
    }
    let remoteUrl
    for (let line of result.message.split('\n')) {
      if (/^origin/.test(line) && /\(push\)/.test(line)) {
        remoteUrl = line.replace(/origin\s+(.+)\s+\(push.+/, '$1')
        break
      }
    }
    if (!remoteUrl) {
      throw new Error('No remote origin found')
    }
    result = await execAsync('git', containerPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!result.message || result.code === 1) {
      throw new Error('No active branch found')
    }
    let branch = _.trim(result.message)
    await execAsync('git', containerPath, ['fetch', 'origin'])
    if (options.info) {
      result = await execAsync('git', containerPath, ['diff', `origin/${branch}`])
      return `A git repo is configured.
Current branch: ${result.message}      
Remote url: ${remoteUrl}${_.trim(result.message) ? '\n' + result.message.split('\n').length + ' file need to be ' : ''}`
    }
    if (options.push || options.pull) {
      await execAsync('git', containerPath, ['add','-A'])
      await execAsync('git', containerPath, ['commit','-m', 'another-commit'])
      this.internalFs.cleanPreviousRootEntry()
      if (options.pull) {
        return execSync(`cd ${containerPath} && git pull origin ${branch}`).toString()
      } else {
        return execSync(`cd ${containerPath} && git push origin ${branch}`).toString()
      }
    }
    throw new Error('Wrong parameters')
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      this.Logger.reset(await this.git(options))
    } catch (e) {
      // console.log(e)
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Git


