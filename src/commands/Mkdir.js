const path = require('path')
const fs = require('../utils/fs')
const _ = require('lodash')

class Mkdir extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.mkdir = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.mkdir = true
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
      description: ['Creates a directory.'],
      examples: [
        'mkdir cryptos',
        'mkdir coin/tron/wallet',
        'mkdir ../other\\ people',
        'mkdir "super folder"'
      ]
    }
  }

  async mkdir(fileSystem, dir) {
    dir = path.resolve(this.config.workingDir, dir)
    let [decParent, encParent, encParentPath] = fileSystem.getParents(dir)
    if (decParent) {
      let dirname = path.basename(dir)
      if (!fileSystem.exists(decParent, dirname)) {
        let encDir = await fileSystem.secrez.encryptItem(dirname)
        if (encDir.length > 255) {
          this.Logger.red('The directory name is too long (when encrypted is larger than 255 chars.)')
        } else {
          let fullPath = path.join(encParentPath || '/', encDir)
          try {
            let realPath = fileSystem.realPath(fullPath)
            await fs.ensureDirAsync(realPath)
            encParent[`${fileSystem.itemId};${encDir}`] = {}
            decParent[`${fileSystem.itemId++};${dirname}`] = {}
          } catch (e) {
            this.Logger.red(e.message)
            return false
          }
        }
      } else {
        this.Logger.red('The directory already exist.')
      }

    } else {
      this.Logger.red('Parent directory not found. Use "-p" to create the parent directories too.')
    }
  }

  async exec(options) {
    if (!options.path) {
      this.Logger.red('Directory name not specified.')
    } else {
      await this.mkdir(this.prompt.fileSystem, options.path)
    }
    this.prompt.run()
  }
}

module.exports = Mkdir


