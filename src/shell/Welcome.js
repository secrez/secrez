
const chalk = require('chalk')
const inquirer = require('inquirer')

class Welcome extends require('./Section') {

  constructor(secrez) {
    super(secrez)
  }

  start() {

    if (this.secrez.isReady()) {
      this.print('green', 'Welcome back!')
      return this.secrez.login()
    } else {
      this.print('green', 'Welcome!')
      return this.secrez.signup()
    }
  }

}

module.exports = Welcome