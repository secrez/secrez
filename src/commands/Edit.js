const path = require('path')
const fs = require('../utils/fs')
const chalk = require('chalk')
const Crypto = require('../utils/Crypto')

class Edit extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.edit = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.edit = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      }
    ]
  }

  help() {
    return {
      description: [
        'Edits a file containing a secret.',
        '"edit" uses the default cli editor creating a temp file during the editing.',
        'If the secret is only one line, or you prefer to keep everything strictly inside Secrez, use "modify".'
      ],
      examples: [
        'edit ../coins/ether2-pwd'
      ]
    }
  }

  async edit(fileSystem, file) {
    let [content, filePath, ver] = await this.prompt.commands.cat.cat(fileSystem, file)
    if (content) {
      let {newContent} = await this.prompt.inquirer.prompt([{
        type: 'editor',
        name: 'newContent',
        default: content,
        message: 'Editing.',
        validate: function (text) {
          return true
        }
      }])
      if (newContent !== content) {
        let encContent = await fileSystem.secrez.encryptItem(newContent)
        ver++
        await fs.appendFileAsync(filePath, `\n${ver};${Crypto.timestamp(true)};${encContent}`)
        this.Logger.black(`File saved. Version: ${ver}`)
      } else {
        this.Logger.black('File not changed.')
      }
    } else {
      this.Logger.black(`edit: ${file}: No such file or directory`)
    }
  }

  async exec(options) {
    await this.edit(this.prompt.fileSystem, options.path)
    this.prompt.run()
  }
}

module.exports = Edit


