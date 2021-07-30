const {execSync} = require('child_process')
const {execAsync} = require('@secrez/utils')
const chalk = require('chalk')
const _ = require('lodash')
const {ConfigUtils} = require('@secrez/core')

const GitHelper = require('../utils/GitHelper')

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
      },
      {
        name: 'ignore-remote-repo-changes',
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
        ['git -P', '(notice the uppercase P) pulls from origin and merges'],
          ['git --ignore-remote-repo-changes true', 'tells Secrez to ignore the safety check for remote changes before updating the data'],
        ['git --ignore-remote-repo-changes false', 'tells Secrez to not ignore the safety check for remote changes']
      ]
    }
  }

  async git(options) {
    let containerPath = this.secrez.config.container
    if (!this.gitHelper) {
      this.gitHelper = new GitHelper(containerPath)
    }

    if (typeof options.ignoreRemoteRepoChanges !== 'undefined') {
      const env = await ConfigUtils.getEnv(this.secrez.config)
      if (options.ignoreRemoteRepoChanges) {
        switch (options.ignoreRemoteRepoChanges.toLowerCase()) {
          case 'true':
            env.ignoreRemoteRepoChanges = true
            break
          case 'false':
            env.ignoreRemoteRepoChanges = false
            break
          default:
            throw new Error('Unsupported value')
        }
        ConfigUtils.putEnv(this.secrez.config, env)
        return 'Configuration updated'
      } else {
        throw new Error('--ignore-remote-repo-changes requires a value (true or false)')
      }
    }

    let result
    if (!(await this.gitHelper.isInstalled())) {
      throw new Error('Git not installed')
    }

    let repoExists = await this.gitHelper.isInstalled()

    if (options.init) {
      if (repoExists) {
        throw new Error('Repo already initiated.')
      }
      return await this.gitHelper.initRepo(options.mainBranch)
    } else if (!repoExists) {
      throw new Error('Repo not found. Run "git --init" to initiate the repo')
    }



    if (options.mainBranch) {
      await this.gitHelper.setMainBranch(options.mainBranch)
      return `New main branch: ${options.mainBranch}`
    }

    result = await execAsync('git', containerPath, ['remote', '-v'])
    let remoteUrl = await this.gitHelper.getRemoteUrl()
    if (options.remoteUrl) {
      await await this.gitHelper.setRemoteUrl(options.remoteUrl)
      return `Remote url: ${options.remoteUrl}`
    }

    let branch = await this.gitHelper.getActiveBranch()
    if (!branch) {
      throw new Error('No active branch found')
    }

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
    if (!remoteUrl) {

      if (options.push) {
        return await this.gitHelper.commitChanges(options.message)
      }
    } else {

      if (await this.gitHelper.isRemoteRepoChanged(branch)) {
        throw new Error(`${chalk.black(strResult)}

The repo has been remotely changed. 
Please, quit Secrez and merge your repo manually to avoid conflicts.
`)
      }

      if (options.push) {
        return `${await this.gitHelper.commitChanges(options.message)}
${execSync(`cd ${containerPath} && git ${options.pull ? 'pull' : 'push'} origin ${branch}`).toString()}
`
      } else {
        throw new Error('Wrong parameters')
      }
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


