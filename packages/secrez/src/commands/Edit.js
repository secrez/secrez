const {Crypto} = require('@secrez/core')

class Edit extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.edit = {
      _func: this.pseudoFileCompletion(this),
      _self: this
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
        ['edit ../coins/ether2-pwd', 'uses tiny-cli-editor'],
        ['edit ../bitcoin/seed -e *', 'uses the OS default editor'],
        ['edit ../bitcoin/seed -e nano', 'uses nano as editor']

      ]
    }
  }

  async edit(internalFs, options) {
    let file = options.path
    let [content, filePath, ver] = await internalFs.cat({path: file})
    let extraMessage = this.chalk.dim('Press <enter> to launch ')
        + (
            !options.editor ? 'the editor.'
                : options.editor !== '*' ? `${options.editor}.`
                : 'your OS default editor.'
        )
        + this.chalk.reset(
            options.editor ? '' : this.chalk.grey('\n  Ctrl-d to save the changes. Ctrl-c to abort.')
        )

    let {newContent} = await this.prompt.inquirer.prompt([{
      type: 'multiEditor',
      name: 'newContent',
      message: 'Editing...',
      default: content,
      tempDir: this.config.tmpPath,
      validate: function (text) {
        return true
      },
      extraMessage
    }])

    if (newContent !== content) {
      let encContent = await internalFs.secrez.encryptItem(newContent)
      ver++
      await this.fs.appendFile(filePath, `\n${ver};${Crypto.timestamp(true)};${encContent}`)
      this.Logger.reset(`File saved. Version: ${ver}`)
    } else {
      this.Logger.reset('Changes aborted or file not changed')
    }
  }

  getTinyCliEditorBinPath() {
    if (!this.editorBinPath) {
      let bin = this.path.resolve(__dirname, '../../node_modules/tiny-cli-editor/bin.js')
      if (!this.fs.existsSync(bin)) {
        bin = this.path.resolve(__dirname, '../../../../node_modules/tiny-cli-editor/bin.js')
      }
      if (!this.fs.existsSync(bin)) {
        throw new Error('Default editor not found')
      }
      this.editorBinPath = bin
    }
    return this.editorBinPath
  }

  async exec(options) {
    let currentEditor = process.env.EDITOR
    if (!options.editor) {
      process.env.EDITOR = this.getTinyCliEditorBinPath()
      // console.log(process.env.EDITOR)
    } else if (options.editor !== '*') {
      process.env.EDITOR = options.editor
    }
    try {
      await this.edit(this.prompt.internalFs, options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    // eslint-disable-next-line require-atomic-updates
    process.env.EDITOR = currentEditor
    this.prompt.run()
  }
}

module.exports = Edit


