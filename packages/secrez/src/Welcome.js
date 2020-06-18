const inquirer = require('inquirer')
const fs = require('fs-extra')
const cliConfig = require('./cliConfig')
const Logger = require('./utils/Logger')
const U2fClient = require('./U2fClient')

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
    let runSharedLogin
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
    let u2fClient = new U2fClient()
    await u2fClient.discover(secrez)
    let signer
    let list = u2fClient.list()
    if (list.length === 1) {
      signer = list[0]
    } else {
      let p = await inquirer.prompt([
        {
          type: 'list',
          name: 'signer',
          message: 'Which second factor would you like to use?',
          choices: list
        }
      ])
      signer = p.signer
    }
    let signatureData
    // for (; ;) {
      try {
        try {
          if (u2fClient.keys[signer]) {
            let registration = u2fClient.keys[signer]
            signatureData = await u2fClient.sign(registration, 'Touch the key to authenticate...')
            console.log(signatureData)
          } else {
            let p = await inquirer.prompt([{
              name: 'mnemonic',
              type: 'password',
              message: 'Paste your mnemonic:',
              validate: value => {
                if (value.length && value.split(' ').length === 12) {
                  return true
                } else {
                  return 'Please paste a valid 12-words mnemonic'
                }
              }
            }])
            signatureData = p.mnemonic
          }
          await secrez.sharedSignin(signer, signatureData)
          if (secrez.masterKeyHash) {
            await this.saveIterations(secrez)
          }
          return
        } catch (e) {
          Logger.red(`${e.message}. Try again or Ctrl-C to exit.`)
        }
      } catch (e) {
        Logger.red('Unrecognized error. Try again or Ctrl-c to exit.')
      }
    // }
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
