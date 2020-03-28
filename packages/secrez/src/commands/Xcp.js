class Xcp extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.xcp = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.xcp = true
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
      },
      {
        name: 'external',
        alias: 'e',
        type: String
      },
      {
        name: 'move',
        alias: 'm',
        type: Boolean
      },
      {
        name: 'clipboard',
        alias: 'c',
        type: Number
      },
      {
        name: 'delete',
        alias: 'd',
        type: Number
      }
    ]
  }

  help() {
    return {
      description: ['Cross-copies files and directories between the OS and Secrez.'],
      examples: [
        ['xcp -e seed.json .', 'copies the external file seed.json in the current directory'],
        ['xcp -me seed.json ethSeed.json', 'moves the external file seed.json from the disk'],
        ['xcp ../passwords/twitter -e ~/Desktop/ ', 'exportes the secret to the external desktop'],
        ['xcp secret1 -e ~/Desktop/ -d 20', 'exportes and deletes after 20 seconds'],
        ['xcp pass1 -c 10', 'copies pass1 into the clipboard and delete it after 10 seconds'],
        ['xcp -re ~/passwords old-passwords/.', 'imports the entire folder passwords']
      ]
    }
  }

  async exec(options) {
    try {
      await this.internalFs.xcp(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Xcp


