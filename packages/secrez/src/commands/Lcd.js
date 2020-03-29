class Lcd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lcd = {
      _func: this.fileCompletion(this, {
        all: true,
        dironly: true
      }),
      _self: this
    }
    this.cliConfig.completion.help.lcd = true
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

  async exec(options) {
    try {
      options.all = true
      options.dironly = true
      await this.prompt.externalFs.cd(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Lcd


