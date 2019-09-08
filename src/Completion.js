const _ = require('lodash')

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

  async subCommands(line) {
    line = _.trim(line).replace(/ +/g, ' ')
    const params = line.split(' ')
    const normalizedParams = params.map(e => e.split('=')[0])
    const command = params[0]
    if (typeof this.completion[command] === 'object') {
      let commands
      let c = this.completion[command]
      if (c._func) {
        commands = await c._func(line)
      } else {
        commands = _.filter(
            Object.keys(c),
            o => {
              return !normalizedParams.includes(o)
            }
        )
      }
      if (commands.length) {
        let prefix = [command]
        for (let param of params) {
          if (c[param.split('=')[0]]) {
            prefix.push(param)
          }
        }
        commands = commands.map(e => `${prefix.join` `} ${e}`)
        return commands
      }
    }
  }
}

function Completion(completion) {
  const instance = new _Completion(completion)

  return async line => {
    let subCommands = await instance.subCommands(line)
    if (subCommands) {
      return subCommands
    }
    return instance.basicCommands()
  }
}


module.exports = Completion
