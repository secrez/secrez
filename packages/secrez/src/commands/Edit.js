const _ = require('lodash')
const {chalk} = require('../utils/Logger')
const path = require('path')
const fs = require('fs-extra')
const {isYaml, yamlParse, yamlStringify} = require('../utils')

class Edit extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.edit = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.edit = true
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
        name: 'editor',
        alias: 'e',
        type: String
      },
      {
        name: 'internal',
        alias: 'i',
        type: Boolean
      },
      {
        name: 'create',
        alias: 'c',
        type: Boolean
      },
      {
        name: 'field',
        alias: 'f',
        type: String
      },
      {
        name: 'unformatted',
        alias: 'u',
        type: Boolean,
        hint: 'If a Yaml file, it edit it without parsing the file'
      }
    ]
  }

  help() {
    return {
      description: [
        'Edits a file containing a secret.',
        'If no default editor is installed, you can use the minimalistic internal editor.',
        'It supports only two commands:', '' +
        '   Ctrl-c to cancel',
        '   Ctrl-d to save',
        'WARNING: Do not quit forcely because a temp file can remain on disk, unencrypted. If for any reason you do it, launch Secrez again because at start it empties the temp folder.'
      ],
      examples: [
        ['edit ../coins/ether2-pwd', 'uses the OS default editor'],
        ['edit ../bitcoin/seed -i', 'uses the minimalistic internalZ editor'],
        ['edit ../bitcoin/seed -e nano', 'choses the editor, in this case nano'],
        ['edit ../bitcoin/seed -e vim', 'uses vim'],
        ['edit babyFile -c', 'creates and edits a new file'],
        ['edit gmail.yml -f password', 'edits only the field password of the yaml file. If the field does not exist, a new field is added'],
        ['edit damaged.yaml -u', 'edits damaged.yaml without parsing it']
      ]
    }
  }

  async edit(options) {
    let file = options.path
    let exists = false
    let data
    try {
      data = await this.prompt.commands.cat.cat({path: file}, true)
      exists = true
    } catch (e) {
      if (options.create) {
        await this.prompt.commands.touch.touch({path: file})
        data = await this.prompt.commands.cat.cat({path: file}, true)
      } else {
        throw e
      }
    }
    let fields = {}
    if (exists && !options.unformatted && isYaml(file)) {
      fields = data[0].content ? yamlParse(data[0].content) : {}
      if (typeof fields === 'object') {
        let choices = Object.keys(fields)
        if (choices.length && !options.field) {
          let {field} = await this.prompt.inquirer.prompt([
            {
              type: 'list',
              name: 'field',
              message: 'Select the field to edit',
              choices
            }
          ])
          options.field = field
        }
      } else {
        delete options.field
      }
    } else if (!isYaml(file)) {
      delete options.field
    }
    let node = this.internalFs.tree.workingNode.getChildFromPath(file)
    let content = options.field ? fields[options.field] || '' : data[0].content

    let newContent
    // if (!/[\r\n]+/.test(content)) {
    //   newContent = await this.useInput(Object.assign(options, {name: options.field || path.basename(options.path), content}))
    // } else {
      newContent = await this.useEditor(Object.assign(options, {content}))
    // }

    if (newContent && newContent !== content) {
      let entry = node.getEntry()
      if (options.field) {
        fields[options.field] = _.trim(newContent)
        entry.content = yamlStringify(fields)
      } else {
        entry.content = newContent
      }
      await this.internalFs.tree.update(node, entry)
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

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    let currentEditor
    try {
      currentEditor = process.env.EDITOR
      if (options.internal) {
        process.env.EDITOR = this.getTinyCliEditorBinPath()
      } else if (options.editor) {
        process.env.EDITOR = options.editor
      }
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


