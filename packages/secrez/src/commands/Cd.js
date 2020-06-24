const {Node} = require('@secrez/fs')

class Cd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.cd = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.cd = true
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
        type: String,
        defaultValue: '/'
      }
    ]
  }

  help() {
    return {
      description: ['Changes the working directory.'],
      examples: [
        'cd coin',
        'cd ../passwords',
        ['cd', 'moves to the root, like "cd /"'],
        ['cd ~', '~ is equivalent to /'],
      ]
    }
  }

  async cd(options) {
    let currentIndex = this.internalFs.treeIndex
    let startingPath = options.path
    let data = await this.internalFs.getTreeIndexAndPath(options.path)
    if (currentIndex !== data.index) {
      await this.internalFs.mountTree(data.index, true)
    }
    options.path = startingPath ? data.path : '/'
    let tree = data.tree
    let p = tree.getNormalizedPath(options.path)
    if (!p || /^(\/|~|~\/)$/.test(p)) {
      tree.workingNode = tree.root
    } else if (p === '.') {
      // nothing
    } else {
      let node = tree.root.getChildFromPath(p)
      if (Node.isDir(node)) {
        tree.workingNode = node
      } else {
        throw new Error('You cannot cd to a file')
      }
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      await this.cd(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Cd


