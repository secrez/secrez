const path = require('path')
const fs = require('../utils/fs')
const _ = require('lodash')
const Crypto = require('../utils/Crypto')

class Cat extends require('../Command') {

  setHelpAndCompletion() {
    this.config.completion.cat = {
      _func: this.fileCompletion(this)
    }
    this.config.completion.help.cat = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'metadata',
        alias: 'm',
        type: Boolean
      },
      {
        name: 'version',
        alias: 'v',
        type: Number
      },
      {
        name: 'all',
        alias: 'a',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Shows the content of a file.'],
      examples: [
        'cat ../passwords/Facebook',
        ['cat wallet -m', 'show metadata: ts at creation and version'],
        ['cat etherWallet -v 2', 'shows the version 2 of the secret, if exists'],
        ['cat etherWallet -a', 'lists all the versions']
      ]
    }
  }

  async cat(fileSystem, options) {
    let file = options.path
    file = path.resolve(this.config.workingDir, file)
    let [decParent, encParent, encParentPath] = fileSystem.getParents(file)
    let [p] = fileSystem.pickDir(decParent, path.basename(file))
    if (p) {
      let id = p.replace(/^(\d+);.+/, '$1')
      let [encName] = fileSystem.pickDir(encParent, null, id)
      let filePath = fileSystem.realPath(`${encParentPath || ''}/${fileSystem.getName(encName)}`)
      if (fs.existsSync(filePath)) {
        let decFile = (await fs.readFileAsync(filePath, 'utf8')).split('\n')
        if (options.all) {
          for (let row of decFile) {
            let [ver, ts, data] = row.split(';')
            let content = await fileSystem.secrez.decryptItem(data)
            this.Logger.yellow(`Version: v${ver} - Date: ${Crypto.dateFromB58(ts)}`)
            this.Logger.black(content)
          }
          return [0]
        } else {
          let row
          if (options.version) {
            for (let r of decFile) {
              if (RegExp(`^${options.version};`).test(r)) {
                row = r
                break
              }
            }
            if (!row) {
              this.Logger.black(`cat: ${file}: Version not found.`)
              return []
            }
          } else {
            row = decFile[decFile.length - 1]
          }
          let [ver, ts, data] = row.split(';')
          let content = await fileSystem.secrez.decryptItem(data)
          return [content, filePath, parseInt(ver), ts]
        }
      }
    } else {
      this.Logger.black(`cat: ${file}: No such file or directory`)
    }
    return []
  }

  async exec(options) {
    // eslint-disable-next-line no-unused-vars
    let [content, a, ver, ts] = await this.cat(this.prompt.fileSystem, options)
    if (content) {
      if (typeof content === 'string') {
        if (options.metadata) {
          this.Logger.yellow(`Version: v${ver} - Date: ${Crypto.dateFromB58(ts)}`)
        }
        this.Logger.black(content)
      }
    }
    this.prompt.run()
  }
}

module.exports = Cat


