const inquirer = require('inquirer')
const inquirerCommandPrompt = require('inquirer-command-prompt')
inquirer.registerPrompt('command', inquirerCommandPrompt)

const path = require('path')
const {InternalFs, ExternalFs, DataCache} = require('secrez-fs-0-8-8')
const {Secrez} = require('secrez-core-0-8-2')

const Logger = require('../utils/Logger')
const welcome = require('../Welcome')

const Migration = require('../migrations/Migration')

class Prompt {

  async init(options) {
    this.secrez = new (Secrez())()
    await this.secrez.init(options.container, options.localDir)
    this.secrez.cache = new DataCache(path.join(this.secrez.config.container, 'cache'), this.secrez)
    this.secrez.cache.initEncryption('alias')
    await this.secrez.cache.load('id')
    this.internalFs = new InternalFs(this.secrez)
    this.externalFs = new ExternalFs(this.secrez)
    this.inquirer = inquirer
    this.commandPrompt = inquirerCommandPrompt
    inquirerCommandPrompt.setConfig({
      history: {
        save: false,
        limit: 100
      }
    })
    this.context = options.context || 0
    this.migration = new Migration(this)
    if (options.reverse) {
      if (!(await this.migration.reverse())) {
        Logger.red('No safe backup found')
      }
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    }
    if (options.done) {
      if (!(await this.migration.done())) {
        Logger.red('No safe backup found')
      }
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    }
  }

  async run(options = {}) {
    const [password, iterations] = await welcome.start(this.secrez, options)
    this.internalFs.init().then(() => delete this.showLoading)
    this.loadingMessage = 'Initializing'
    this.loggedIn = true
    let alerts = this.internalFs.tree.alerts
    if (alerts.length) {
      Logger.red(alerts[0])
      Logger.cyan(alerts.slice(1).join('\n'))
    }
    await this.secrez.cache.load('alias')
    await this.secrez.cache.load('contact')
    if (!this.migration.isMigrationNeeded()) {
      Logger.reset('db already migrated to version 3')
    } else {
      await this.migration.migrate(password, iterations)
    }
  }

  async useConfirm(options) {
    let {result} = await this.inquirer.prompt([
      {
        type: 'confirm',
        name: 'result',
        message: options.message,
        default: options.default
      }
    ])
    return result

  }

}

module.exports = Prompt

