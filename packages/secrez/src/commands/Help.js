class Help extends require('../Command') {

  setHelpAndCompletion() {
    this.optionDefinitions = [
      {
        name: 'command',
        alias: 'c',
        defaultOption: true,
        type: String
      }
    ]
  }

  help() {
    if (!this.helpDescription) {
      this.helpDescription = ['Available options:']
      let maxSize = 0
      let commands = Object.keys(this.cliConfig.completion.help)
      for (let command of commands) {
        maxSize = Math.max(maxSize, command.length)
      }
      let done = false
      for (let command of commands) {
        if (!done && command > 'help') {
          this.helpDescription.push(`help${' '.repeat(1 + maxSize - 'help'.length)} This help.`)
          done = true
        }
        let help = this.prompt.commands[command].help()
        this.helpDescription.push(`${command}${' '.repeat(1 + maxSize - command.length)} ${help.description[0]}`)
      }
      this.helpDescription.push('\nTo get help about single commands, specify the command.')
    }
    return {
      description: this.helpDescription,
      examples: [
        'help list',
        'help set'
      ],
      completion: this.completion
    }
  }

  format(data, command) {
    let spacer = '  '
    if (!Array.isArray(data.description)) {
      data.description = [data.description]
    }
    console.info()
    this.Logger.reset(data.description[0])
    if (data.description[1]) {
      data.description.slice(1).map(e => this.Logger.reset(`  ${e}`))
    }
    if (command) {
      let optionDefinitions = this.prompt.commands[command].optionDefinitions
      let commandNames = optionDefinitions.map(e => e.name)
      if (commandNames.length) {
        console.info()
        this.Logger.reset('Available options:')
        let max = 0
        for (let c of commandNames) {
          max = Math.max(max, c.length)
        }
        for (let c of optionDefinitions) {
          let type = c.type === Boolean ? 'Boolean' : c.type === Number ? 'Number' : 'String'
          this.Logger.log(
              'black',
              spacer + '-' + c.alias + ', --' + c.name + ' '.repeat(max - c.name.length + 3),
              'grey', type + (c.defaultOption
                  ? (type !== 'Boolean' ? '    ' : '  ') + '(default)'
                  : ''
          ))
        }
      }
    }
    console.info()
    this.Logger.reset('Examples:')
    let max = 0
    let c = ''
    for (let e of data.examples) {
      if (Array.isArray(e)) {
        c = `(${e[1]})`
        e = e[0]
      }
      max = Math.max(max, e.length)
    }
    for (let e of data.examples) {
      c = ''
      if (Array.isArray(e)) {
        c = `(${e[1]})`
        e = e[0]
      }
      if (c) {
        this.Logger.log('black', spacer + e + ' '.repeat(max - e.length + 1), 'grey', c)
      } else {
        this.Logger.log('black', spacer + e)
      }
    }
    console.info()
  }

  async exec(options) {
    let help
    let command = options.command
    if (command) {
      if (this.prompt.commands[command]) {
        help = this.prompt.commands[command].help()
      } else {
        this.Logger.red('Invalid command.')
        return this.prompt.run()
      }
    } else {
      help = this.help()
    }
    this.format(help, command)
    this.prompt.run()
  }
}

module.exports = Help


