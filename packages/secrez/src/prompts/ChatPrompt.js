const chalk = require('chalk')
const cliConfig = require('../cliConfig')
const Commands = require('../commands')
const Logger = require('../utils/Logger')
const {sleep, UglyDate, decolorize, getCols} = require('@secrez/utils')

class ChatPrompt extends require('./CommandPrompt') {

  async init(options) {
    this.secrez = options.secrez
    this.getReady({
      historyPath: options.historyPath,
      completion: 'chatCompletion',
      commands: (new Commands(this, cliConfig, 'chat')).getCommands(),
      environment: options.environment,
      context: 'chat'
    })
    await this.loadSavedHistory()
    this.uglyDate = new UglyDate
  }

  async start() {
    this.stop = false
    for (; ;) {
      await sleep(1000)
      if (this.stop) {
        break
      }
      if (!this.environment.room || this.skip) {
        continue
      }
      try {
        let newMessages = await this.environment.courier.getRecentMessages({direction: 1})
        if (newMessages.length) {
          this.onMessages(newMessages)
        }
      } catch (e) {
        // console.log(e)
        break
      }
    }
  }

  // async readHistoryMessages(options = {}) {
  //   this.skip = true
  //   const {minTimestamp, maxTimestamp, since, to} = options
  //   Logger.bold(`Messages${since ? ` since ${since}` : ''}${to ? ` to ${to}` : ''}`)
  //   let newMessages = await this.environment.courier.getSomeMessages({
  //     payload: {
  //       minTimestamp,
  //       maxTimestamp,
  //       publickey: this.environment.room[0].publicKey,
  //       limit: 1000
  //     }
  //   })
  //   let len = newMessages.length
  //   if (len) {
  //     this.onMessages(newMessages, {
  //       fromHistory: true,
  //       verbose: options.verbose,
  //       lastLine: chalk.grey(`${len} message${len > 1 ? 's' : ''} found.`)
  //     })
  //     // Logger.grey(`${len} message${len > 1 ? 's' : ''} found`)
  //   } else {
  //     Logger.yellow('None found')
  //   }
  //   delete this.skip
  // }

  prePromptMessage(options = {}) {
    if (this.environment.room) {
      this.clearScreen.pause(true)
      let nicks = this.nicks(this.environment.room[0].contact)
      return [
        chalk.grey(' ' + nicks[0]),
        // chalk.bold(this.environment.room[0].contact)
      ].join('')
    } else {
      this.clearScreen.pause(false)
      return chalk.reset('Secrez/chat')
    }
  }

  promptMessage() {
    if (this.environment.room) {
      return '>'
    } else {
      return '$'
    }
  }

  nicks(name) {
    let max = Math.max(2, name.length)
    let result = [
      'me' + ' '.repeat(max - 2),
      name + ' '.repeat(max - name.length)
    ]
    return result
  }

  async onMessages(messages, options = {}) {
    delete this.prefixLength
    let rl = this.getRl()
    let position = rl.cursor
    let presetLine = rl.line
    let diff = (presetLine.length - position)
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    for (let message of messages) {
      process.stdout.write(this.formatResults(message, options) + '\n')
    }
    if (options.lastLine) {
      process.stdout.write(options.lastLine + '\n')
    }
    if (!options.fromHistory) {
      process.stdout.write(this.lastPrefix + ' ' + chalk.bold(':') + ' ')
    }
    process.stdout.write(presetLine)
    process.stdout.moveCursor(-diff)
    rl.line = presetLine.substring(0, presetLine.length - diff)
    rl.write(null, {ctrl: true, name: 'e'})
    rl.line = presetLine
  }

  formatSpaces(message, prefix) {
    if (!this.prefixLength) {
      this.prefixLength = decolorize(prefix, true).length
      this.cols = getCols()
    }
    let cols = this.cols - this.prefixLength
    let rows = []

    for (;;) {
      let partial = message.substring(0, cols + 1)
      let lastIndex = partial.lastIndexOf(' ')
      rows.push(
          (rows.length ? ' '.repeat(this.prefixLength - 1) : '') +
          (message.length < cols ? message : message.substring(0, lastIndex))
      )
      if (message.length < cols) {
        break
      } else {
        message = message.substring(lastIndex)
      }
    }
    return rows.join('\n')
  }

  formatResults(message, options) {
    let from = message.direction === 1
    let contact = this.environment.contactsByPublicKey[message.publickey]
    let nicks = this.nicks(contact)
    let time = ''
    if (options.fromHistory) {
      if (options.verbose) {
        time = new Date(message.timestamp).toISOString()
      } else {
        time = this.uglyDate.shortify(message.timestamp)
        if (time.length < 3) {
          time = ' ' + time
        }
      }
    }
    let prefix = [
      chalk.grey(from ? '@' : ' ' + nicks[0]),
      chalk.bold(from ? nicks[1] : ''),
      chalk.grey(time ? ' ' + time : ''),
      chalk.bold(' > '),
    ].join('')
    return prefix + chalk[from ? 'reset' : 'grey'](this.formatSpaces(message.decrypted, prefix))
  }

  onBeforeClose() {
    delete this.environment.room
    this.stop = true
    this.clearScreen.pause(false)
  }

  async postRun(options = {}) {
    let cmd = options.cmd.split(' ')
    let command = cmd[0]
    if (/^\//.test(command) || !this.basicCommands.includes(command)) {
      options.cmd = `send -m "${options.cmd.replace(/^\//, '').replace(/"/g, '\\"')}"`
    }
    await this.exec([options.cmd])
  }

}

module.exports = ChatPrompt


