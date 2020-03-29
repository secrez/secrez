class Cd extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.cd = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.cd = true
    this.optionDefinitions = [
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

  cd(options) {
    let ifs = this.internalFs
    let p = ifs.getNormalizedPath(options.path)
    if (!p || /^(\/|~|~\/)$/.test(p)) {
      ifs.tree.workingNode = ifs.tree.root
    } else if (p === '.') {
      // nothing
    } else {
      let node = ifs.tree.root.getChildFromPath(p)
      if (!ifs.isFile(node)) {
        ifs.tree.workingNode = node
      } else {
        throw new Error('You cannot cd to a file')
      }
    }
  }

  async exec(options = {}) {
    try {
      await this.cd(options)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Cd


