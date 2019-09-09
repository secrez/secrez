const path = require('path')
const fs = require('../utils/fs')
const chalk = require('chalk')
const Crypto = require('../utils/Crypto')

class Add extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.add = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.add = true
    this.optionDefinitions = [
      {
        name: 'content',
        alias: 'c',
        type: String
      },
      {
        name: 'hidden',
        alias: 'h',
        type: Boolean
      },
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
        'Creates a file containing a secret.',
        '"add" expects a file path (the default value) and a content.',
        'If some or both are not provided "add" will ask for them.'
      ],
      examples: [
        'add',
        'add -c afe456f4e3a3cdc4',
        'add ../coins/ether2-pwd -c "hs^teg&66_2jhsg"',
        ['add "my new wallet" -h', 'prompts a password (hidden) input for the secret']
      ]
    }
  }

  async add(fileSystem, file, content) {
    file = path.resolve(this.config.workingDir, file)
    let [decParent, encParent, encParentPath] = fileSystem.getParents(file)
    if (decParent) {
      let dirname = path.basename(file)
      if (!fileSystem.exists(decParent, dirname)) {
        let encFile = await fileSystem.secrez.encryptItem(dirname)
        if (encFile.length > 255) {
          this.Logger.red('The directory name is too long (when encrypted is larger than 255 chars.)')
        } else {
          let encContent = await fileSystem.secrez.encryptItem(content)
          let fullPath = path.join(encParentPath || '/', encFile)
          try {
            let realPath = fileSystem.realPath(fullPath)
            await fs.writeFileAsync(realPath, `1;${Crypto.timestamp(true)};${encContent}`)
            encParent[`${fileSystem.itemId};${encFile}`] = true
            decParent[`${fileSystem.itemId++};${dirname}`] = true
          } catch (e) {
            this.Logger.red(e.message)
            return false
          }
        }
      } else {
        this.Logger.red('The file already exist.')
      }

    } else {
      this.Logger.red('Parent directory not found.')
    }
  }

  async exec(options) {
    let prompt = this.prompt
    let exitCode
    if (!options.path) {
      this.Logger.red('A path where to save the secret is required.')
    } else {
      this.Logger.grey(`Fullpath: ${path.resolve(this.config.workingDir, `./${options.path}`)}`)
      if (!options.content) {
        let {content} = await prompt.inquirer.prompt([
          {
            type: options.hidden ? 'password' : 'input',
            name: 'content',
            message: 'Type your secret',
            validate: val => {
              if (val) {
                if (val !== exitCode) {
                  exitCode = undefined
                }
                return true
              }
              exitCode = Crypto.getRandomString(2, 'hex')
              return chalk.grey(`Please, type your secret. If you like to cancel, type the code ${exitCode}`)
            }
          }
        ])
        // eslint-disable-next-line require-atomic-updates
        options.content = content
      }
      if (options.content !== exitCode) {
        await this.add(prompt.fileSystem, options.path, options.content)
      }
    }
    prompt.run()
  }
}

module.exports = Add


