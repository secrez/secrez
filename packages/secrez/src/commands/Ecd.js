class Ecd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ecd = {
      _func: this.fileCompletion(this, this.config.onlyDir),
      _self: this
    }
    this.config.completion.help.ecd = true
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
        'ecd ~/Downloads',
        ['ecd', 'change to home dir, like "ecd ~"'],
        'ecd /var/nginx/log',
      ]
    }
  }

  async exec(options) {
    try {
      await this.prompt.externalFs.cd(options.path)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Ecd


