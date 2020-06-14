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
      },
      {
        name: 'all-file',
        alias: 'a',
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
        ['copy google.yml -a', 'copies the google card as is'],
        ['copy google.yml', 'it will ask to chose the field to copy'],
        ['copy myKey -v UY5d', 'copies version UY5d of myKey']
      ]
    }
  }

  async copy(options = {}) {
    let cat = this.prompt.commands.cat
    let currentIndex = this.internalFs.treeIndex
    let data = await this.internalFs.getTreeIndexAndPath(options.path)
    if (currentIndex !== data.index) {
      await this.internalFs.mountTree(data.index, true)
    }
    options.path = data.path
    let tree = data.tree
    let p = tree.getNormalizedPath(options.path)
    let file = tree.root.getChildFromPath(p)
    if (Node.isFile(file)) {
      let entry = (await cat.cat({
        path: p,
        version: options.version,
        unformatted: true
      }))[0]
      if (Node.isText(entry)) {
        let {name, content} = entry
        if (isYaml(p) && !options.allFile) {
          let parsed
          try {
            parsed = yamlParse(content)
          } catch (e) {
              throw new Error('The yml is malformed. To copy the entire content, do not use th options -j or -f')
          }
          if (options.json) {
            content = JSON.stringify(parsed, null, 2)
          } else if (options.field) {
            if (parsed[options.field]) {
              content = parsed[options.field]
            } else {
              throw new Error(`Field "${options.field}" not found in "${path.basename(p)}"`)
            }
          } else {
            options.choices = Object.keys(parsed)
            options.message = 'Select the field to copy'
            options.field = await this.useSelect(options)
            if (!options.field) {
              throw new Error('Command canceled')
            } else {
              content = parsed[options.field]
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
      this.Logger.green('Copied to clipboard:')
      this.Logger.reset(name)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Copy


