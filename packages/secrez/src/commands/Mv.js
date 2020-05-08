const chalk = require('chalk')
const {Crypto} = require('@secrez/core')
const {Node} = require('@secrez/fs')

class Mv extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.mv = {
      _func: this.pseudoFileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.mv = true
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
      }
    ]
  }

  help() {
    return {
      description: ['Moves and renames files or folders.',
        'It asks for the destination.'],
      examples: [
        'mv somefile',
        'mv -p ../dir1/file',
        ['mv pass/email*', 'moves all the files starting from email contained in pass']
      ]
    }
  }

  async mv(options, nodes) {
    if (nodes) {
      for (let node of nodes) {
        await this.internalFs.change({
          path: node.getPath(),
          newPath: options.newPath
        })
      }
    } else {
      await this.internalFs.change({
        path: options.path,
        newPath: options.newPath
      })
    }
  }

  isNotDir(destination) {
    let dir
    try {
      let p = this.internalFs.normalizePath(destination)
      dir = this.tree.root.getChildFromPath(p)
    } catch (e) {
    }
    return !(dir && Node.isDir(dir))
  }


  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (!options.path) {
        throw new Error('An origin path is required.')
      } else {
        let useWildcard = /\?|\*/.test(options.path)
        let nodes = await this.internalFs.pseudoFileCompletion(options.path, null, true)
        if (nodes.length) {
          let prompt = this.prompt
          let exitCode = Crypto.getRandomBase58String(2)
          let destination = options.destination
          /* istanbul ignore if  */
          if (destination) {
            if (useWildcard) {
              console.log(destination)
              if (this.isNotDir(destination)) {
                throw new Error('When using wildcards, the target has to be a folder')
              }
            }
          } else {
            destination = (await prompt.inquirer.prompt([
              {
                type: 'input',
                name: 'destination',
                message: 'Type the destination',
                validate: val => {
                  if (val) {
                    if (useWildcard) {
                      if (this.isNotDir(val)) {
                        return chalk.red('When using wildcards, the target has to be a folder')
                      }
                    } else {
                      return true
                    }
                  }
                  return chalk.grey(`Please, type the destination, or cancel typing ${exitCode}`)
                }
              }
            ])).destination
          }
          if (destination === exitCode) {
            throw new Error('Command canceled.')
          } else {
            await this.mv({
              path: options.path,
              newPath: destination
            }, nodes)
            this.Logger.reset(`${options.path} has been moved to ${destination}`)
          }
        } else {
          this.Logger.red('Path does not exist')
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Mv


