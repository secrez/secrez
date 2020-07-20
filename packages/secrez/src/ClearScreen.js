const chalk = require('chalk')
const clear = require('clear')
const {sleep} = require('@secrez/utils')
const cliConfig = require('./cliConfig')

class ClearScreen {

  async clearScreen() {
    this.clearIsRunning = true
    if (Date.now() - this.lastCommandAt > 1000 * cliConfig.clearScreenAfter) {
      clear()
      console.info(chalk.grey(`Terminal has been cleared after ${cliConfig.clearScreenAfter} seconds of inactivity.`))
      process.stdout.write(this.lastpre + ' ')
      this.clearIsRunning = false
    } else {
      await sleep(100 * cliConfig.clearScreenAfter)
      this.clearScreen()
    }
  }

  setLastCommandAt(lastpre) {
    this.lastpre = lastpre
    this.lastCommandAt = Date.now()
  }

  async start(options) {
    if (!this.clearIsRunning) {
      this.clearScreen()
    }
  }

}

const clearScreen = new ClearScreen()
clearScreen.setLastCommandAt()
clearScreen.start()

module.exports = clearScreen

