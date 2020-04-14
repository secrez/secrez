const fs = require('fs-extra')
const path = require('path')
const clipboardy = require('clipboardy')

const {Node} = require('@secrez/fs')

class Export extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.export = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.export = true
    this.optionDefinitions = [
      {
        name: 'path',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'clipboard',
        alias: 'c',
        type: Number
      },
      {
        name: 'object',
        alias: 'o',
        type: Boolean
      },
      {
        name: 'version',
        alias: 'v',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: [
        'Export encrypted data to the OS in the current local folder',
        'Files and folders are decrypted during the process.',
        'Export to clipboard works only with text files.'
      ],
      examples: [
        ['export seed.json', 'decrypts and copies seed.json to the disk'],
        ['export ethKeys -c 20', 'copies to the clipboard for 20 seconds'],
        ['export ethKeys -c 20 -o', 'copies to the clipboard the JSON of the object'],
        ['export ethKeys -v 8uW3', 'exports version 8uW3 of the file']
      ]
    }
  }

  async export(options = {}) {
    let ifs = this.internalFs
    let efs = this.externalFs
    let cat = this.prompt.commands.cat
    let lpwd = this.prompt.commands.lpwd
    let p = this.tree.getNormalizedPath(options.path)
    let file = ifs.tree.root.getChildFromPath(p)
    if (Node.isFile(file)) {
      let entry = (await cat.cat({
        path: p,
        version: options.version
      }))[0]
      if (options.clipboard) {
        if (Node.isText(entry)) {
          let {name, content} = entry
          content = options.all
              ? JSON.stringify({name, content}, null, 2)
              : content
          await clipboardy.write(content)
          setTimeout(async () => {
            if (content === (await clipboardy.read())) {
              await clipboardy.write('')
            }

          }, 1000 * options.clipboard)
          return name
        } else {
          throw new Error('You can copy to clipboard only text files.')
        }

      } else {
        let dir = await lpwd.lpwd()
        let newPath = path.join(dir, path.basename(p))
        let name = await efs.getVersionedBasename(newPath)
        await fs.writeFile(path.join(dir, name), entry.content, Node.isBinary(entry) ? 'base64' : undefined)
        return name
      }
    } else {
      throw new Error('Cannot export a folder')
    }
  }

  async exec(options = {}) {
    try {
      let name = await this.export(options)
      this.Logger.agua(options.clipboard ? 'Copied to clipboard:' : 'Exported file:')
      this.Logger.reset(name)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Export


