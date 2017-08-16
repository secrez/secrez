
const chalk = require('chalk')
const inquirer = require('inquirer')

class Welcome extends require('./Section') {

  constructor(secrez) {
    super(secrez)
  }

  start() {

    if (this.secrez.isReady()) {
      this.print('green', 'Welcome back.')
      return this.login()
    } else {
      this.print('green', 'Welcome!\nPlease signup to create a local account')
      return this.signup()
    }
  }

  login(callback) {
    return inquirer
        .prompt([
          {
            name: 'password',
            type: 'password',
            message: 'Enter your master password:',
            validate: value => {
              if (value.length) {
                return true;
              } else {
                return 'Please enter your master password.';
              }
            }
          }
        ])
        .then(p => this.secrez.login(p.password))
        .catch(err => {
          this.error('The password you typed is wrong. Try again or Ctrl-C to exit.')
          return this.login()
        })

  }

  signup(callback) {
    return inquirer
        .prompt([
          {
            name: 'password',
            type: 'password',
            message: 'Enter your password:',
            validate: value => {
              if (value.length) {
                return true;
              } else {
                return 'Please enter your password';
              }
            }
          },
          {
            name: 'retype',
            type: 'password',
            message: 'Retype your password:',
            validate: value => {
              if (value.length) {
                return true;
              } else {
                return 'Please enter your password';
              }
            }
          }
        ])
        .then(p => {
          if (p.password === p.retype) {
            return this.secrez.signup(p.password)
          } else {
            this.error('The two passwords do not match. Try again')
            return this.signup()
          }
        })
        .catch(err => {
          this.error('Unrecognized error. Try again')
          return this.login()
        })
  }

}

module.exports = Welcome