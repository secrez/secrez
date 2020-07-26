const chalk = require('chalk')
const clear = require('clear')
const {sleep} = require('@secrez/utils')
const cliConfig = require('../cliConfig')
const {ConfigUtils} = require('@secrez/core')

let thiz

class ClearScreen {

  constructor(config) {
    thiz = this
    this.config = config
  }

  async clear() {
    const env = await ConfigUtils.getEnv(thiz.config)
    let seconds = env.clearScreenAfter || cliConfig.clearScreenAfter
    this.clearIsRunning = true
    if (Date.now() - thiz.lastCommandAt > 1000 * seconds) {
      clear()
      console.info(chalk.grey(`Terminal has been cleared after ${seconds} seconds of inactivity. Press right-arrow to restore the prompt.`))
      this.clearIsRunning = false
    } else {
      await sleep(100 * seconds)
      this.clear()
    }
  }

  setLastCommandAt() {
    thiz.lastCommandAt = Date.now()
    thiz.start()
  }

  start() {
    if (!this.clearIsRunning) {
      this.clear()
    }
  }

}

module.exports = ClearScreen

