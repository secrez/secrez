const { authenticator } = require('otplib')
const {isYaml, yamlParse} = require('../utils')
const {Node} = require('@secrez/fs')

class Totp extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.totp = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.totp = true
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
      }
    ]
  }

  help() {
    return {
      description: [
        'Generate a TOTP code if a totp field exists in the card.'
      ],
      examples: [
        ['totp coinbase.yml', 'prints a totp code and copies it to the clipboard for 5 seconds'],
        ['totp coinbase.yml -d 2', 'keeps it in the clipboard for 2 seconds'],
      ]
    }
  }

  async totp(options = {}) {
    let err = 'The file is not a card with a totp field'
    let currentIndex = this.internalFs.treeIndex
    let data = await this.internalFs.getTreeIndexAndPath(options.path)
    /* istanbul ignore if  */
    if (currentIndex !== data.index) {
      await this.internalFs.mountTree(data.index, true)
    }
    options.path = data.path
    let tree = data.tree
    let p = tree.getNormalizedPath(options.path)
    let file = tree.root.getChildFromPath(p)
    if (Node.isFile(file)) {
      let entry = (await this.prompt.commands.cat.cat({
        path: p,
        version: options.version ? [options.version] : undefined,
        unformatted: true
      }))[0]
      if (Node.isText(entry)) {
        let {content} = entry
        if (isYaml(p) && !options.allFile) {
          let parsed
          try {
            parsed = yamlParse(content)
          } catch (e) {
            throw new Error('The yml is malformed')
          }
          let totp = parsed.totp
          if (totp) {
            const token = authenticator.generate(totp)
            this.prompt.commands.copy.copy({
              thisString: token,
              duration: [options.duration || 5]
            })
            return token
          }
        }
      }
    }
    throw new Error(err)
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let token = await this.totp(options)
      this.Logger.grey('TOTP token: ' + this.chalk.bold.black(token) )
      this.Logger.grey(`It will stay in the clipboard for ${options.duration || 5} seconds`)
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Totp


