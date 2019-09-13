const {Crypto} = require('@secrez/core')

class Edit extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.edit = {
      _func: this.pseudoFileCompletion(this)
    }
    this.config.completion.help.edit = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'editor',
        alias: 'e',
        type: String
      }
    ]
  }

  help() {
    return {
      description: [
        'Edits a file containing a secret.',
        'By default, it uses "tiny-cli-editor", an editor with only two commands:', '' +
        '   Ctrl-c to cancel',
        '   Ctrl-d to save',
        'You can use you favorite editor using the options "-e" (see the examples)',
        'WARNING: Do not quit forcely because a temp file can remain on disk, unencrypted. If for any reason you do it, launch Secrez again because at start it empties the temp folder.'
      ],
      examples: [
        'edit ../coins/ether2-pwd',
        ['edit ../bitcoin/seed -e *', 'tells Secrez to use the default editor'],
        ['edit ../bitcoin/seed -e nano', 'tells Secrez to use nano as editor']

      ]
    }
  }

  async edit(internalFileSystem, options) {
    let file = options.path
    let [content, filePath, ver] = await internalFileSystem.cat({path: file})
    if (content) {

      let message = this.chalk.dim('Press <enter> to launch ')
          + (
              !options.editor ? 'tiny-cli-editor.'
                  : options.editor !== '*' ? `${options.editor}.`
                  : 'your OS default editor.'
          )

      let extraMessage = options.editor ? '' : this.chalk.grey('\n  Ctrl-d to save the changes. Ctrl-c to cancel.')

      let {newContent} = await this.prompt.inquirer.prompt([{
        type: 'editor2',
        name: 'newContent',
        message,
        default: content,
        tempDir: this.config.tmpPath,
        validate: function (text) {
          return true
        },
        extraMessage
      }])
      if (newContent !== content) {
        let encContent = await internalFileSystem.secrez.encryptItem(newContent)
        ver++
        await this.fs.appendFileAsync(filePath, `\n${ver};${Crypto.timestamp(true)};${encContent}`)
        this.Logger.dim(`File saved. Version: ${ver}`)
      } else {
        this.Logger.dim('File not changed')
      }
    } else {
      this.Logger.red('No such file or directory')
    }
  }

  async exec(options) {
    let currentEditor
    if (!options.editor || options.editor !== '*') {
      currentEditor = process.env.EDITOR
      process.env.EDITOR = options.editor || this.path.resolve(__dirname, '../../node_modules/tiny-cli-editor/bin.js')
    }
    await this.edit(this.prompt.internalFileSystem, options)
    if (currentEditor) {
      // eslint-disable-next-line require-atomic-updates
      process.env.EDITOR = currentEditor
    }
    this.prompt.run()
  }
}

module.exports = Edit


