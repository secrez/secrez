const fs = require('fs-extra')
const path = require('path')

const {Utils, config} = require('@secrez/core')

class Import extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.import = {
      _func: this.fileCompletion(this),
      _self: this
    }
    this.cliConfig.completion.help.import = true
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
        name: 'move',
        alias: 'm',
        type: Boolean
      },
      {
        name: 'binary-too',
        alias: 'b',
        type: Boolean
      },
      // {
      //   name: 'recursive',
      //   alias: 'r',
      //   type: Boolean
      // },
      {
        name: 'simulate',
        alias: 's',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: [
        'Import files from the OS into the current folder',
        'By default binary files are not imported since they can be very large.',
        'To include them, use the -b option.',
        'During a move, only the imported files are moved. To avoid problems',
        'you can simulate the process using -s and see which ones will be imported.',
        'Import is not recursive, but supports wildcards.'
      ],
      examples: [
        ['import seed.json', 'copies seed.json from the disk into the current directory'],
        ['import -m ethKeys', 'copies ethKeys and remove it from the disk'],
        ['import -p ~/passwords', 'imports all the files in the folder passwords'],
        // ['import -r ~/data -t', 'imports only text files in the folder, recursively'],
        ['import ~/data -s', 'simulates the process listing all involved files']
      ]
    }
  }

  async import(options = {}) {
    let ifs = this.internalFs
    let efs = this.externalFs
    let p = efs.getNormalizedPath(options.path)
    if (await fs.pathExists(p)) {
      let isDir = await efs.isDir(p)
      let list = isDir ? (await efs.getDir(p))[1].map(f => path.join(p, f)) : [p]
      let content = []
      for (let fn of list) {

        // recursion will be supported later :o)
        if (await efs.isDir(fn)) {
          continue
        }

        let isBinary = await Utils.isBinary(fn)
        if (isBinary && !options['binary-too']) {
          continue
        }
        content.push([fn, isBinary, await fs.readFile(fn, isBinary ? 'base64' : 'utf8')])
      }

      let result = []
      let moved = []
      for (let fn of content) {
        let name = await this.tree.getVersionedBasename(path.basename(fn[0]))
        result.push(name)
        if (!options.simulate) {
          if (options.move) {
            moved.push(fn[0])
          }
          await ifs.make({
            path: name,
            type: fn[1] ? config.types.BINARY : config.types.TEXT,
            content: fn[2]
          })
        }
      }
      if (options.move) {
        for (let fn of moved) {
          await fs.unlink(fn)
        }
      }
      return result.sort()
    } else {
      return []
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      let files = await this.import(options)
      if (files.length) {
        let extra = ''
        if (options.simulate) {
          extra = ' (simulation)'
        } else if (options.move) {
          extra = ' (moved)'
        }
        this.Logger.agua(`Imported files${extra}:`)
        this.Logger.reset(files.join('\n'))
      } else {
        this.Logger.red('No file has been imported.')
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Import


