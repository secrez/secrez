/* globals Promise */

const _ = require('lodash')
const chalk = require('chalk')

const Secrez = require('../Secrez')
const pkg = require('../../package')
const Welcome = require('./Welcome')
const Home = require('./Home')

class Shell {

  constructor() {
    this.secrez = new Secrez()
  }

  start() {
    console.log(
        chalk.bold(
            '\n\nsecrez v' + pkg.version
        )
    )
    return this.secrez.init()
        .then(() => new Welcome(this.secrez).start(this.home))
        .then(() => new Home(this.secrez).menu())

  }

}

module.exports = new Shell().start()