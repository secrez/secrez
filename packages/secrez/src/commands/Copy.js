const path = require('path')
const clipboardy = require('clipboardy')
const {isYaml, yamlParse} = require('../utils')

const {Node} = require('@secrez/fs')

class Copy extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.copy = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.copy = true
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
        name: 'duration',
        alias: 'd',
        type: Number
      },
      {
        name: 'json',
        alias: 'j',
        type: Boolean
      },
      {
        name: 'field',
        alias: 'f',
        type: String
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
        'Copy a text file to the clipboard.'
      ],
      examples: [
        ['copy ethKeys', 'copies to the clipboard for 10 seconds (the default)'],
        ['copy google.yml -t 20 -f password', 'copies the password in the google card'],
        ['copy google.yml -j', 'copies the google card as a JSON'],
        ['copy myKey -v UY5d', 'copies version UY5d of myKey']
      ]
    }
  }

  async copy(options = {}) {
    let ifs = this.internalFs
    let cat = this.prompt.commands.cat
    let p = this.tree.getNormalizedPath(options.path)
    let file = ifs.tree.root.getChildFromPath(p)
    if (Node.isFile(file)) {
      let entry = (await cat.cat({
        path: p,
        version: options.version,
        unformatted: true
      }))[0]
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
          } catch (e) {
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
        }, 1000 * (options.duration || 10))
        return name
      } else {
        throw new Error('You can copy to clipboard only text files.')
      }
    } else {
      throw new Error('Cannot copy a folder')
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      let name = await this.copy(options)
      this.Logger.agua('Copied to clipboard:')
      this.Logger.reset(name)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Copy


