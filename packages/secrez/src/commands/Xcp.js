class Xcp extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.xcp = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.config.completion.help.xcp = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        multiple: true,
        type: String,
        defaultValue: '/'
      },
      {
        name: 'recursive',
        alias: 'r',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Cross-copies files and directories between the OS and Secrez.'],
      examples: [
        ['xcp e:seed.json .', 'importes the external file seed.json in the current directory'],
        ['xcp ../passwords/twitter e:~/Desktop/ ', 'exportes the secret to the external desktop'],
        ['xcp -r e:~/passwords old-passwords/.', 'imports the entire folder passwords']
      ]
    }
  }

  async xcp(internalFs, dir) {
    dir = internalFs.getNormalizedPath(dir)
    let [folder, dirObj] = internalFs.getDir(dir)
    if (dirObj) {
      if (dirObj === true) {
        this.Logger.red('That is not a directory')
      } else {
        this.config.workingDir = dir
        internalFs.workingDirObj = dirObj
      }
    } else {
      this.Logger.red('No such directory')
    }
  }

  async exec(options) {
    try {
      await this.xcp(this.prompt.internalFs, options.path)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Xcp

