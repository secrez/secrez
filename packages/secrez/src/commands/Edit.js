const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')

class Edit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.edit = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.edit = true
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

  async edit(options) {
    let file = options.path
    let data = await this.prompt.commands.cat.cat({path: file})
    let node = this.internalFs.tree.root.getChildFromPath(file)
    let {content} = data[0]
    let extraMessage = chalk.dim('Press <enter> to launch ')
        + (
            !options.editor ? 'the editor.'
                : options.editor !== '*' ? `${options.editor}.`
                : 'your OS default editor.'
        )
        + chalk.reset(
            options.editor ? '' : chalk.grey('\n  Ctrl-d to save the changes. Ctrl-c to abort.')
        )

    let {newContent} = await this.prompt.inquirer.prompt([{
      type: 'multiEditor',
      name: 'newContent',
      message: 'Editing...',
      default: content,
      tempDir: this.cliConfig.tmpPath,
      validate: function (text) {
        return true
      },
      extraMessage
    }])

    if (newContent && newContent !== content) {
      let entry = node.getEntry()
      entry.content = newContent
      await this.internalFs.update(node, entry)
      this.Logger.reset('File saved.')
    } else {
      this.Logger.reset('Changes aborted or file not changed')
    }
  }

  getTinyCliEditorBinPath() {
    if (!this.editorBinPath) {
      let bin = path.resolve(__dirname, '../../node_modules/tiny-cli-editor/bin.js')
      if (!fs.existsSync(bin)) {
        bin = path.resolve(__dirname, '../../../../node_modules/tiny-cli-editor/bin.js')
      }
      if (!fs.existsSync(bin)) {
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
      await this.edit(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    // eslint-disable-next-line require-atomic-updates
    process.env.EDITOR = currentEditor
    this.prompt.run()
  }
}

module.exports = Edit


