const chalk = require('chalk')
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
      this.helpDescription.push('\nTo get help about single commands, specify the command, or use the -h option.')
    }
    return {
      description: this.helpDescription,
      examples: [
        'help touch',
        'import -h'
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
          let space = c.multiple ? '[] ' : '   '
          this.Logger.log(
              'black',
              spacer +
              (c.alias ? '-' + c.alias + ', ' : '')
              + '--' + c.name + ' '.repeat(max - c.name.length + 3) +
              (c.alias ? '' : '    '),
              'grey',
              type + space + (type !== 'Boolean' ? ' ' : '') + (
                  c.defaultOption
                      ? '(default)'
                      : '         '
              ),
              'grey',
              c.hint ? ' (' + c.hint + ')' : ''
          )
        }
      }
    }
    if (data.examples.length) {
      this.Logger.reset('Examples:')
      let max = 0
      const cols = process.stdout.columns
          || 80 // workaround for lerna testing
      let MAX = parseInt(cols * 2 / 6)
      for (let e of data.examples) {
        if (Array.isArray(e)) {
          e = e[0]
        }
        max = Math.max(max, e.length)
        if (max > MAX) {
          max = MAX
          break
        }
      }

      const formatExample = (example, ...hint) => {
        hint = hint.length ? `(${hint.join(' ')})` : undefined
        let str = []
        let i = 0
        let tot = (2 * spacer.length) + max
        let x = 0
        let j = -1
        let elem
        for (; ;) {
          let m = max - x
          if (example.length <= m) {
            elem = spacer + ' '.repeat(x) + example
            str.push(elem + ' '.repeat(tot - elem.length))
            break
          } else {
            j = -1
            let partial = example.substring(0, m)
            let li = partial.lastIndexOf(' ')
            if (li === -1) {
              j = i
              li = example.lastIndexOf(' ')
              if (li === -1) {
                elem = spacer + ' '.repeat(x) + example
                str.push(elem)
                break
              }
            }
            let good = example.substring(0, li)
            elem = spacer + ' '.repeat(x) + good
            str.push(elem + ' '.repeat(tot - elem.length))
            example = example.substring(li + 1)
            i++
            // console.log(i, example)
          }
          x = 2
        }
        let len = str[0].length
        if (hint && i === j) {
          i++
          str[i] = ' '.repeat(len)
        }
        let xam = cols - len
        x = 0
        if (hint) {
          for (; ;) {
            if (!str[i]) {
              str[i] = ' '.repeat(len)
            }
            let m = xam - x
            if (hint.length <= m) {
              str[i] += ' '.repeat(x) + chalk.grey(hint)
              break
            }
            let partial = hint.substring(0, m)
            let li = partial.lastIndexOf(' ')
            if (li === -1) {
              j = i
              li = hint.lastIndexOf(' ')
              if (li === -1) {
                elem = ' '.repeat(x) + hint
                str[i] += chalk.grey(elem)
                break
              }
            }

            let good = hint.substring(0, li)
            str[i] += ' '.repeat(x) + chalk.grey(good)
            hint = hint.substring(li + 1)
            i++
            x = 2
          }
        }
        console.info(str.join('\n'))
      }

      for (let e of data.examples) {
        if (typeof e === 'string') {
          e = [e]
        }
        if (!Array.isArray(e)) {
          e = [e]
        }
        formatExample(...e)
      }
    }
    console.info()
  }

  async exec(options = {}) {
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


