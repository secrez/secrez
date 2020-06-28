const fs = require('fs-extra')
const _ = require('lodash')

class Commands {

  constructor(prompt, config) {
    this.prompt = prompt
    this.config = config
  }

  getCommands(exceptions = [], refresh) {
    if (!this.list || refresh) {
      this.list = _.filter(fs.readdirSync(__dirname), e => e !== 'index.js')
      this.commands = {}
      for (let file of this.list) {
        let command = file.split('.')[0]
        if (exceptions.includes(command)) {
          continue
        }
        try {
          const klass = require(`./${command}`)
          const instance = new klass(this.prompt, this.config)
          instance.setHelpAndCompletion()
          this.commands[command.toLowerCase()] = instance
        } catch (e) {
          if (process.env.NODE_ENV === 'dev') {
            console.debug(`${file} is not a command`)
          }
        }
      }
    }
    return this.commands
  }

}

module.exports = Commands
