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
      },
      {
        name: 'message',
        type: String
      },
      {
        name: 'init',
        type: Boolean
      },
      {
        name: 'remote-url',
        type: String
      },
      {
        name: 'main-branch',
        type: String
      }
    ]
  }

  help() {
    return {
      description: ['Minimalistic git repo managements.',
        'For missing commands use "shell" instead, like:',
        'shell "cd ~/.secrez && git history"'],
      examples: [
        ['git -i', 'get info about the repo, like the remote url'],
        ['git -p', 'adds all changes and commits. If there is a remote origin, it also pushes to the remote repo'],
        ['git -p --message "before migrating the db"', 'adds a message to the push; in general, it is better to not specify messages, but in some special case, it can be useful to add a message'],
        ['git --init', 'initiates a git repo using "master" as main branch'],
        ['git --init --main-branch main', 'initiates a git repo using "main" as main branch'],
        ['git --main-branch main', 'sets the main branch'],
        ['git --remote-url git@github.com:sullof/priv-repo.git', 'sets the origin of the local repo'],
        ['git -P', '(notice the uppercase P) pulls from origin and merges']
      ]
    }
  }

  async git(options) {
    let result = await execAsync('which', __dirname, ['git'])
    if (!result.message || result.code === 1) {
      throw new Error('Git not installed')
    }
    let containerPath = this.secrez.config.container
    let repoExists = await fs.pathExists(path.join(containerPath, '.git'))

    if (options.init) {
      if (repoExists) {
        throw new Error('Repo already initiated.')
      }
      let res = (await execAsync('git', containerPath, ['init'])).message
      await execAsync('git', containerPath, ['add', '-A'])
      res += '\n' + (await execAsync('git', containerPath, ['commit', '-m', 'first-commit'])).message
      await execAsync('git', containerPath, ['branch', '-M', options.mainBranch || 'master'])
      return res
    }

    if (options.mainBranch) {
      await execAsync('git', containerPath, ['branch', '-M', options.mainBranch])
      return `New main branch: ${options.mainBranch}`
    }

    if (!repoExists) {
      throw new Error('Repo not found. Run "git --init" to initiate the repo')
    }

    result = await execAsync('git', containerPath, ['remote', '-v'])
    let remoteUrl
    if (result.message && result.code !== 1) {
      for (let line of result.message.split('\n')) {
        if (/^origin/.test(line) && /\(push\)/.test(line)) {
          remoteUrl = line.replace(/origin\s+(.+)\s+\(push.+/, '$1')
          break
        }
      }
    }
    if (options.remoteUrl) {
      if (remoteUrl) {
        await execAsync('git', containerPath, ['remote', 'remove', 'origin'])
      }
      await execAsync('git', containerPath, ['remote', 'add', 'origin', options.remoteUrl])
      return `Remote url: ${options.remoteUrl}`
    }

    result = await execAsync('git', containerPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (!result.message || result.code === 1) {
      throw new Error('No active branch found')
    }
    let branch = _.trim(result.message)

    result = await execAsync('git', containerPath, ['status'])
    let count = 0

    if (_.trim(result.message) && /untracked files/i.test(result.message)) {
      let message = _.trim(result.message).split('\n')
      for (let row of message) {
        if (/\s+(data(\w+|)|keys|cache)\//.test(row)) {
          count++
        }
      }
    }

    this.internalFs.cleanPreviousRootEntry()

    if (options.info) {
      return `       
Current branch: ${chalk.bold(branch)}
Number of changed files: ${chalk.bold(count)}
`
    }

    let strResult = 'Nothing done'
    if (options.push) {
      await execAsync('git', containerPath, ['add', '-A'])
      strResult = (await execAsync('git', containerPath, ['commit', '-m', options.message || 'another-commit'])).message
    }

    if (!remoteUrl) {
      return strResult
    }

    result = await execAsync('git', containerPath, ['remote', '-v', 'update'])
    if (!result.message || result.code === 1) {
      throw new Error('Error checking for remote updates')
    }
    let message = (result.message + result.error).split('\n')
    let isRemotelyChanged = true
    for (let row of message) {
      if (/\[up to date\]/.test(row)) {
        row = row.split(']')[1].replace(/ +/g, ' ').split(' ')
        if (row[1] === branch) {
          isRemotelyChanged = false
        }
      }
    }
    if (isRemotelyChanged) {
      throw new Error(`${chalk.black(strResult)}

The repo has been remotely changed. 
Please, quit Secrez and merge your repo manually to avoid conflicts.
`)
    }

    if (options.push) {
      return `${strResult}
${execSync(`cd ${containerPath} && git ${options.pull ? 'pull' : 'push'} origin ${branch}`).toString()}
`
    } else {
      throw new Error('Wrong parameters')
    }
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


