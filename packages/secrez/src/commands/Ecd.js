
class Ecd extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.ecd = {
      _func: this.fileCompletion(this, this.config.onlyDir)
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
    await this.prompt.externalFileSystem.ecd(options.path)
    this.prompt.run()
  }
}

module.exports = Ecd


