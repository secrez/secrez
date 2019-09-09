
class Cd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.cd = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.cd = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
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

  async cd(fileSystem, dir) {
    // debug('normalize', this.normalize(dir))
    dir = fileSystem.getDirPath(dir)
    let dirObj = fileSystem.getDir(dir)
    if (dirObj) {
      this.config.workingDir = dir
      fileSystem.workingDirObj = dirObj
    } else {
      this.Logger.red('No such file or directory')
    }
  }


  async exec(options) {
    await this.cd(this.prompt.fileSystem, options.path)
    this.prompt.run()
  }
}

module.exports = Cd


