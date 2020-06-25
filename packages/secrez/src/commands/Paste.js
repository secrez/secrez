const clipboardy = require('clipboardy')
const {isYaml, yamlParse, yamlStringify} = require('../utils')

const {Node} = require('@secrez/fs')

class Paste extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.paste = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.paste = true
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
        name: 'append',
        alias: 'a',
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
        'Paste whatever is in the clipboard in an encrypted entries.'
      ],
      examples: [
        ['paste ethKeys.json', 'pastes in ethKeys.json even if it exists'],
        ['paste -a -p google.txt', 'pastes appending the content to the existent content in google.txt'],
        ['paste yahoo.yml -f password', 'pastes the field password in the card']
      ]
    }
  }

  async paste(options = {}) {
    let ifs = this.internalFs
    let cat = this.prompt.commands.cat
    let p = this.internalFs.tree.getNormalizedPath(options.path)
    let file
    let existingContent
    try {
      file = ifs.tree.root.getChildFromPath(p)
      existingContent = (await cat.cat({path: p, unformatted: true}))[0].content
    } catch (e) {
      //
    }
    if (file && !Node.isFile(file)) {
      throw new Error('Cannot paste to a folder or a binary file')
    }
    let content = await clipboardy.read()
    if (!content) {
      throw new Error('The clipboard does not contain any text')
    }
    if (isYaml(p) && options.field) {
      let parsed = {}
      if (existingContent) {
        try {
          parsed = yamlParse(existingContent)
        } catch (e) {
          throw new Error('The yaml file exists but it is malformed.')
        }
      }
      parsed[options.field] = content
      content = yamlStringify(parsed)
    }
    if (file) {
      if (options.append) {
        content = existingContent + '\n' + content
      }
      await ifs.change({
        path: p,
        content
      })
    } else {
      await ifs.make({
        path: p,
        type: this.cliConfig.types.TEXT,
        content
      })
    }
    await clipboardy.write('')

    return options.path

  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let name = await this.paste(options)
      this.Logger.grey('Pasted the clipboard to:')
      this.Logger.reset(name)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Paste


