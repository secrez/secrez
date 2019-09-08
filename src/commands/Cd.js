
class Cd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.cd = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.cd = true
    this.optionDefinitions = [
      {
        name: 'directory',
        alias: 'd',
        defaultOption: true,
        type: String,
        defaultValue: '/'
      }
    ]
  }

  help() {
    return {
      description: ['Browses the directories.'],
      examples: [
        'cd coin',
        'cd ../passwords',
        ['cd', 'moves to the root, like "cd /"'],
        ['cd ~', '~ is equivalent to /'],
      ]
    }
  }

  async exec(options) {
    await this.prompt.fileSystem.cd(options.directory)
    this.prompt.run()
  }
}

module.exports = Cd


