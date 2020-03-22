const inquirer = require('inquirer')
const fs = require('fs-extra')
const cliConfig = require('./cliConfig')
const Logger = require('./utils/Logger')

class Welcome {

  async start(secrez, options) {
    this.options = options
    this.iterations = options.iterations || await this.getIterations()
    if (await fs.pathExists(cliConfig.confPath)) {
      await this.login(secrez)
    } else {
      Logger.grey('Please signup to create your local account')
      await this.signup(secrez)
    }
  }

  async getIterations() {
    if (await fs.pathExists(cliConfig.envPath)) {
      return require(cliConfig.envPath).iterations
    } else {
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
  }

  async saveIterations() {
    if (this.options.saveIterations && !await fs.pathExists(cliConfig.envPath)) {
      fs.writeFile(cliConfig.envPath, JSON.stringify({iterations: this.iterations}))
    }
  }

  async login(secrez) {
    for (; ;) {
      try {
        let p = await inquirer.prompt([{
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
          await secrez.signin(p.password, this.iterations)
          if (secrez.masterKeyHash) {
            this.saveIterations()
            return
          }
        } catch (e) {
          Logger.red('The password you typed is wrong. Try again or Ctrl-C to exit.')
        }
      } catch (e) {
        Logger.red('Unrecognized error. Try again or Ctrl-c to exit.')
      }
    }
  }

  async signup(secrez) {
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
            await secrez.signup(p.password, this.iterations)
            this.saveIterations()
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
