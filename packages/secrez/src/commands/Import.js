const fs = require('fs-extra')
const path = require('path')

const {Utils, config} = require('@secrez/core')
const {Node} = require('@secrez/fs')
const {fromCsvToJson, yamlStringify, isYaml} = require('../utils')

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
      {
        name: 'simulate',
        alias: 's',
        type: Boolean
      },
      {
        name: 'expand',
        alias: 'e',
        type: String
      },
      // {
      //   name: 'recursive',
      //   alias: 'r',
      //   type: Boolean
      // }
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
        'Import can import data from password managers and other software. If in CSV format, the first line must list the field names and one field must be "path". Similarly, if in JSON format, a "path" key is mandatory in any item. Path should be relative. If not, it will be converted.'
      ],
      examples: [
        ['import seed.json', 'copies seed.json from the disk into the current directory'],
        ['import -m ethKeys', 'copies ethKeys and remove it from the disk'],
        ['import -p ~/passwords', 'imports all the files in the folder passwords'],
        // ['import -r ~/data -t', 'imports only text files in the folder, recursively'],
        ['import ~/data -s', 'simulates the process listing all involved files'],
        ['import backup.json -e /fromPasspack', 'imports a backup expanding it to many folders and file in the folder /fromPasspack'],
        ['import backup.json -e .', 'imports a backup in the current folder'],
        ['import backup.csv -e /', 'imports a backup in the root']
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
        result.push(ifs.tree.getNormalizedPath(name))
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

  async expand(options) {
    let ifs = this.internalFs
    let efs = this.externalFs
    let fn = efs.getNormalizedPath(options.path)
    if (!(await fs.pathExists(fn))) {
      throw new Error('The file does not exist')
    }
    let str = await fs.readFile(fn, 'utf-8')
    let ext = path.extname(fn)
    let data
    try {
      if (ext === '.json') {
        data = JSON.parse(str)
      } else if (ext === '.csv') {
        data = fromCsvToJson(str)
      }
    } catch (e) {
      if (e.message === 'The header of the CSV looks wrong') {
        throw e
      } else {
        throw new Error('The file has a wrong format')
      }
    }
    if (data.length === 0) {
      throw new Error('The data is empty')
    }
    if (!data[0].path) {
      throw new Error('The data does not show a path field')
    }
    let extra = ''
    if (options.simulate) {
      extra = ' (simulation)'
    } else if (options.move) {
      extra = ' (moved)'
    }
    this.Logger.agua(`Imported files${extra}:`)

    let parentFolderPath = this.internalFs.tree.getNormalizedPath(options.expand)
    let parentFolder
    try {
      parentFolder = ifs.tree.root.getChildFromPath(parentFolderPath)
    } catch (e) {
      await this.prompt.commands.mkdir.mkdir({path: parentFolderPath, type: config.types.DIR})
      parentFolder = ifs.tree.root.getChildFromPath(parentFolderPath)
    }
    if (!Node.isDir(parentFolder)) {
      throw new Error('The destination folder is not a folder.')
    }
    for (let item of data) {
      let p = item.path
      if (!p) {
        continue
      }
      p = path.resolve(parentFolderPath, p.replace(/^\//, ''))
      let dirname = path.dirname(p)
      let dir
      try {
        dir = ifs.tree.root.getChildFromPath(dirname)
      } catch (e) {
        await this.prompt.commands.mkdir.mkdir({path: dirname, type: config.types.DIR})
        dir = ifs.tree.root.getChildFromPath(dirname)
      }
      let name = path.basename(p)
      if (!isYaml(name)) {
        name += '.yml'
      }
      name = await this.tree.getVersionedBasename(name, dir)
      this.Logger.reset(path.join(dirname, name))
      if (!options.simulate) {
        delete item.path
        await ifs.make({
          path: path.join(dirname, name),
          type: config.types.TEXT,
          content: yamlStringify(item)
        })
      }
    }
    if (!options.simulate && options.move) {
      await fs.unlink(fn)
    }
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      if (options.expand) {
        await this.expand(options)
      } else {
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
      }
    } catch (e) {
      console.error(e)
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Import


