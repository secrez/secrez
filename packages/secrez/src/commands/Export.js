const fs = require('fs-extra')
const path = require('path')

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
        'Files and folders are decrypted during the process.'
      ],
      examples: [
        ['export seed.json', 'decrypts and copies seed.json to the disk'],
        ['export ethKeys -v 8uW3', 'exports version 8uW3 of the file']
      ]
    }
  }

  async export(options = {}) {
    let efs = this.externalFs
    let cat = this.prompt.commands.cat
    let lpwd = this.prompt.commands.lpwd
    let originalPath = options.path
    let data = await this.internalFs.getTreeIndexAndPath(options.path)
    options.path = data.path
    let tree = data.tree
    let p = tree.getNormalizedPath(options.path)
    let file = tree.root.getChildFromPath(p)
    if (Node.isFile(file)) {
      let entry = (await cat.cat({
        path: originalPath,
        version: options.version,
        unformatted: true
      }))[0]
      let dir = await lpwd.lpwd()
      let newPath = path.join(dir, path.basename(p))
      let name = await efs.getVersionedBasename(newPath)
      await fs.writeFile(path.join(dir, name), entry.content, Node.isBinary(entry) ? 'base64' : undefined)
      return name
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
      this.Logger.green(options.clipboard ? 'Copied to clipboard:' : 'Exported file:')
      this.Logger.reset(name)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Export


