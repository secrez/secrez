const _ = require('lodash')
const {FsUtils} = require('@secrez/fs')

class _Completion {

  constructor(completion) {
    this.completion = completion
  }

  basicCommands() {
    if (!this.commands) {
      this.commands = []
      for (let c in this.completion) {
        this.commands.push(c)
      }
      this.commands.sort()
    }
    return this.commands
  }

  async subCommands(line = '', forceCommand) {
    const originalLine = line
    const params = line.split(' ')
    const normalizedParams = params.map(e => e.split('=')[0])
    const command = params[0]
    let c = this.completion[command]
    if (!c && forceCommand) {
      c = this.completion[forceCommand]
      line = forceCommand + ' ' + line
    }
    if (typeof c === 'object') {
      let commands = []
      let options = {}
      if (c._func) {
        let commandLine = _.trim(line).split(' ').slice(1).join(' ')
        const definitions = c._self.optionDefinitions
        options = FsUtils.parseCommandLine(definitions, commandLine)
        if (options._unknown) {
          options = {}
        }
        let optionsKeys = Object.keys(options)
        let currentOption = optionsKeys.pop()
        if (currentOption === undefined) {
          let defaultOption = definitions.filter(e => e.defaultOption === true)[0]
          if (defaultOption) {
            defaultOption = defaultOption.name
          }
          currentOption = defaultOption
        }
        let files = await c._func(options, originalLine, currentOption)
        commands = files
      } else {
        commands = _.filter(
            Object.keys(c),
            o => {
              return !normalizedParams.includes(o)
            }
        )
        if (commands.length === 1 && commands[0] === '_self') {
          commands = []
        }
      }
      if (commands.length) {
        let l = line
        let lastSpace = l.lastIndexOf(' ')
        for (;;) {
          if (l[lastSpace - 1] !== '\\') {
            break
          }
          l = l.substring(0, lastSpace)
          lastSpace = l.lastIndexOf(' ')
        }
        let lasts = [
          {n: '/', l: line.lastIndexOf('/')},
          {n: '=', l: line.lastIndexOf('=')},
          {n: ' ', l: lastSpace}
        ]
        lasts.sort((a, b) => {
          let A = a.l
          let B = b.l
          return A > B ? -1 : A < B ? 1 : 0
        })
        let v = lasts[0].l
        let prefix = v !== -1 ? line.substring(0, v) + lasts[0].n : line
        if (c._self && !!c._self.prompt.commands[prefix]) {
          prefix += ' '
        }
        commands = commands.map(e => `${prefix}${
            e
                ? e.replace(/ /g, '\\ ')
                : ' '
        }`)
        return commands
      }
    }
  }
}

function Completion(completion, forceCommand) {
  const instance = new _Completion(completion)

  return async line => {
    let subCommands = await instance.subCommands(line, forceCommand)
    if (subCommands) {
      return subCommands
    }
    return instance.basicCommands()
  }
}

module.exports = Completion
