class Lcd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lcd = {
      _func: this.selfCompletion(this, {
        external: true,
        all: true,
        dironly: true
      }),
      _self: this
    }
    this.cliConfig.completion.help.lcd = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
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
      description: ['Changes the external working directory.',
        'Secrez refers to external when refers to unencrypted standard files in the OS.'
      ],
      examples: [
        'lcd ~/Downloads',
        ['lcd', 'change to home dir, like "lcd ~"'],
        'lcd /var/nginx/log',
      ]
    }
  }

  async lcd(options) {
    let dir = options.path
    if (!this.externalFs.initialLocalWorkingDir) {
      this.externalFs.initialLocalWorkingDir = this.cliConfig.localWorkingDir
    }
    if (/^~\//.test(dir) || dir === '~') {
      dir = dir.replace(/^~/, this.externalFs.initialLocalWorkingDir)
    }
    dir = this.externalFs.getNormalizedPath(dir)
    if (await this.externalFs.isDir(dir)) {
      this.cliConfig.localWorkingDir = dir
    } else {
      throw new Error('No such directory')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      options.all = true
      options.dironly = true
      await this.lcd(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Lcd


