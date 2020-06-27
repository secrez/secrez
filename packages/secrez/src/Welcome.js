const chalk = require('chalk')
const inquirer = require('inquirer')
const fs = require('fs-extra')
const cliConfig = require('./cliConfig')
const {Crypto} = require('@secrez/core')
const Logger = require('./utils/Logger')
const Fido2Client = require('./Fido2Client')

class Welcome {

  async start(secrez, options) {
    this.options = options
    this.iterations = options.iterations || await this.getIterations()
    if (await fs.pathExists(cliConfig.keysPath)) {
      let errorCode = await this.login(secrez)
      if (errorCode === 1) {
        await this.sharedLogin(secrez)
      }
    } else {
      Logger.grey('Please signup to create your local account')
      await this.signup(secrez)
    }
  }

  async getIterations() {
    if (await fs.pathExists(cliConfig.envPath)) {
      let env = require(cliConfig.envPath)
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

// chimney piano fabric forest curious black hip axis story stool spoil fold
  async saveIterations(secrez) {
    if (this.options.saveIterations) {
      await secrez.saveIterations(this.iterations)
    }
  }

  async login(secrez) {
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
          await secrez.signin(password, this.iterations)
          if (secrez.masterKeyHash) {
            await this.saveIterations(secrez)
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

  async sharedLogin(secrez) {
    let fido2Client = new Fido2Client(secrez)
    let authenticator
    let list = await fido2Client.getKeys()
    const conf = await secrez.readConf()
    let choices = []
    for (let authenticator in conf.data.keys) {
      choices.push(authenticator)
    }
    for (; ;) {
      if (list.length === 1) {
        authenticator = list[0]
      } else {
        let p = await inquirer.prompt([
          {
            type: 'list',
            name: 'authenticator',
            message: 'Which second factor would you like to use?',
            choices
          }
        ])
        authenticator = p.authenticator
      }
      let secret
      try {
        try {
          if (fido2Client.keys[authenticator]) {
            Logger.grey('Touch your fido2 authenticator device now...')
            secret = await fido2Client.verifySecret(authenticator)
          } else {
            let exitCode = Crypto.getRandomBase58String(2)
            let p = await inquirer.prompt([{
              name: 'recoveryCode',
              type: 'input',
              message: 'Type or paste your recovery code:',
              validate: value => {
                if (value.length) {
                  return true
                } else {
                  return `Please paste a valid recovery code or type ${exitCode} to choose another factor.`
                }
              }
            }])
            if (p.recoveryCode === exitCode) {
              continue
            }
            secret = p.recoveryCode
          }
          let resCode = await secrez.sharedSignin(authenticator, secret)
          if (secrez.masterKeyHash) {
            await this.saveIterations(secrez)
          }
          if (resCode === 1) {
            Logger.bold(chalk.red('Your data has been upgraded.'))
            Logger.red('To avoid conflicts, any registered second factor has been removed.')
            Logger.grey('Please, register them again, thanks.')
          }
          return
        } catch (e) {
          Logger.red(`${e.message}. Try again or Ctrl-C to exit.`)
        }
      } catch (e) {
        Logger.red('Unrecognized error. Try again or Ctrl-C to exit.')
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
            await this.saveIterations(secrez)
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
