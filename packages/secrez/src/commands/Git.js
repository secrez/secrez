const {execSync} = require('child_process')
const {execAsync} = require('@secrez/utils')
const chalk = require('chalk')
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
        alias: 'p',
        type: Boolean
      },
      {
        name: 'pull',
        alias: 'P',
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
        ['git -p', 'adds, commits and pushes to the remote repo; a message is not allowed because it is better not to give any help to a possible hacker about whatever you are committing'],
        ['git --push', 'pulls from origin and merges'],
        ['git -i', 'get info about the repo, like the remote url']
      ]
    }
  }

  async git(options) {
    let result = await execAsync('which', __dirname, ['git'])
    if (!result.message || result.code === 1) {
      throw new Error('Git not installed')
    }
    let containerPath = this.secrez.config.container
    if (!(await fs.pathExists(path.join(containerPath, '.git')))) {
      throw new Error('Repo not found')
    }
    result = await execAsync('git', containerPath, ['remote', '-v'])
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
    result = await execAsync('git', containerPath, ['diff',`origin/${branch}`, '--name-only'])
    let count = 0
    if (_.trim(result.message)) {
      count = _.trim(result.message).split('\n').length
    }

    if (options.info) {
      return `Current branch: ${chalk.bold(branch)}
Remote url: ${chalk.bold(remoteUrl)}
Number of changed files: ${chalk.bold(count)}`
    }

    const addAndCommit = async () => {
      this.internalFs.cleanPreviousRootEntry()
      await execAsync('git', containerPath, ['add', '-A'])
      await execAsync('git', containerPath, ['commit', '-m', 'another-commit'])
    }

    if (options.push || options.pull) {
      if (options.pull) {
        await addAndCommit()
        return execSync(`cd ${containerPath} && git pull origin ${branch}`).toString()
      } else if (count) {
        await addAndCommit()
        return execSync(`cd ${containerPath} && git push origin ${branch}`).toString()
      } else {
        return 'Already up to date'
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
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Git


