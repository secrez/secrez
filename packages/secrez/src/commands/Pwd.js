
class Pwd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.pwd = {}
    this.config.completion.help.pwd = true
  }

  help() {
    return {
      description: ['Shows the path of the working directory.'],
      examples: [
        'pwd'
      ]
    }
  }

  async exec(options) {
    this.Logger.log(`${this.config.workingDir}`)
    this.prompt.run()
  }
}

module.exports = Pwd


