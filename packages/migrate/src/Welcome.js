const chalk = require('chalk')
const inquirer = require('inquirer')
const fs = require('fs-extra')
const {Crypto} = require('secrez-core-0-8-2')
const Logger = require('./utils/Logger')

class Welcome {

  async start(secrez, options) {
    this.secrez = secrez
    this.options = options
    this.iterations = options.iterations || await this.getIterations()
    if (await fs.pathExists(this.secrez.config.keysPath)) {
      let errorCode = await this.login()
      if (errorCode === 1) {
        await this.sharedLogin()
      }
    } else {
      Logger.grey('Please signup to create your local account')
      await this.signup()
    }
  }

  async getIterations() {
    if (await fs.pathExists(this.secrez.config.envPath)) {
      let env = require(this.secrez.config.envPath)
      if (env.iterations) {
        return env.iterations
      }
    }
    let {iterations} = await inquirer.prompt([{
      name: 'iterations',
      type: 'input',
      message: 'Type the number of iterations for password derivation:',
      validate: value => {
        if (value.length && parseInt(value) > 0) {
          return true
        } else {
          return 'Please enter a valid number of iterations.'
        }
      }
    }])
    return parseInt(iterations)
  }

  async saveIterations() {
    if (this.options.saveIterations) {
      await this.secrez.saveIterations(this.iterations)
    }
  }

  async login() {
    for (; ;) {
      try {
        let {password} = await inquirer.prompt([{
          name: 'password',
          type: 'password',
          message: 'Enter your master password:',
          validate: value => {
            if (value.length) {
              return true
            } else {
              return 'Please enter your master password.'
            }
          }
        }])
        try {
          await this.secrez.signin(password, this.iterations)
          if (this.secrez.masterKeyHash) {
            await this.saveIterations()
          }
          return 0
        } catch (e) {
          if (e.message === 'A second factor is required') {
            return 1
          }
          Logger.red(`${e.message}. Try again or Ctrl-C to exit.`)
        }
      } catch (e) {
        Logger.red('Unrecognized error. Try again or Ctrl-c to exit.')
      }
    }
  }

  async signup() {
    for (; ;) {
      try {
        let p = await inquirer.prompt([{
          name: 'password',
          type: 'password',
          message: 'Enter your password:',
          validate: value => {
            if (value.length) {
              return true
            } else {
              return 'Please enter your password'
            }
          }
        }, {
          name: 'retype',
          type: 'password',
          message: 'Retype your password:',
          validate: value => {
            if (value.length) {
              return true
            } else {
              return 'Please enter your password'
            }
          }
        }])
        if (p.password === p.retype) {
          try {
            await this.secrez.signup(p.password, this.iterations)
            await this.saveIterations()
            return
          } catch (e) {
            Logger.red(e.message)
            break
          }
        } else {
          Logger.red('The two passwords do not match. Try again')
        }
      } catch (e) {
        Logger.red('Unrecognized error. Try again or Ctrl-c to exit.')
      }
    }

  }

}

module.exports = new Welcome
