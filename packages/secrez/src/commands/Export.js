const fs = require('fs-extra')
const path = require('path')
const clipboardy = require('clipboardy')
const {isYaml, yamlParse} = require('../utils')

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
        name: 'help',
        alias: 'h',
        type: Boolean
      },
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
        name: 'json',
        alias: 'j',
        type: Boolean
      },
      {
        name: 'version',
        alias: 'v',
        type: Boolean
      },
      {
        name: 'field',
        alias: 'f',
        type: String
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
        ['export ethKeys -v 8uW3', 'exports version 8uW3 of the file'],
        ['export ethKeys -c 20', 'copies to the clipboard for 20 seconds'],
        ['export google.yml -c 20 -f password', 'exports the password in the google card'],
        ['export google.yml -oc 20', 'exports the google card as an JSON']
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
        version: options.version,
        unformatted: true
      }))[0]
      if (options.clipboard) {
        if (Node.isText(entry)) {
          let {name, content} = entry
          if (isYaml(p)) {
            let err = 'Field not found.'
            try {
              let parsed = yamlParse(content)
              if (options.json) {
                content = JSON.stringify(parsed, null, 2)
              } else if (options.field) {
                if (parsed[options.field]) {
                  content = parsed[options.field]
                } else {
                  throw new Error(err)
                }
              }
            } catch(e) {
              if (e.message === err) {
                throw new Error(`Field "${options.field}" not found in "${path.basename(p)}"`)
              } else if (options.json || options.field) {
                throw new Error('The yml is malformed. To copy the entire content, do not use th options -j or -f')
              }
            }
          }
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
    if (options.help) {
      return this.showHelp()
    }
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


