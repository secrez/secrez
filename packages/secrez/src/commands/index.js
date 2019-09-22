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
      for (let command of this.list) {
        command = command.split('.')[0]
        if (exceptions.includes(command)) {
          continue
        }
        const klass = require(`./${command}`)
        const instance = new klass(this.prompt, this.config)
        instance.setHelpAndCompletion()
        this.commands[command.toLowerCase()] = instance
      }
    }
    return this.commands
  }
}

module.exports = Commands
