const inquirer = require('inquirer')
const {fs} = require('@secrez/core')
const config = require('./config')
const Logger = require('./utils/Logger')

class Welcome {

  async start(secrez) {
    if (fs.existsSync(config.confPath)) {
      // Logger.grey('Welcome back!')
      await this.login(secrez)
    } else {
      Logger.grey('Please signup to create your local account')
      await this.signup(secrez)
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
          await secrez.login(p.password)
          if (secrez.masterKey) {
            return
          }
        } catch (err) {
          Logger.red('The password you typed is wrong. Try again or Ctrl-C to exit.')
        }
      } catch (err) {
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
            await secrez.signup(p.password)
            return secrez.masterKey
          } catch (e) {
            Logger.red(e.message)
            break
          }
        } else {
          Logger.red('The two passwords do not match. Try again')
        }
      } catch (err) {
        Logger.red('Unrecognized error. Try again or Ctrl-c to exit.')
      }
    }

  }

}

module.exports = new Welcome
