const fs = require('fs-extra')
const path = require('path')

const {Utils, config, Entry} = require('@secrez/core')
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
      {
        name: 'recursive',
        alias: 'r',
        type: Boolean
      },
      {
        name: 'tags',
        alias: 't',
        type: Boolean
      },
      {
        name: 'use-tags-for-paths',
        alias: 'u',
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
        'Import can import data from password managers and other software. If in CSV format, the first line must list the field names and one field must be "path". Similarly, if in JSON format, a "path" key is mandatory in any item. Path should be relative. If not, it will be converted.'
      ],
      examples: [
        ['import seed.json', 'copies seed.json from the disk into the current directory'],
        ['import -m ethKeys', 'copies ethKeys and remove it from the disk'],
        ['import -p ~/passwords', 'imports all the text files in the folder passwords'],
        ['import -b -p ~/passwords', 'imports all the files, included binaries'],
        ['import -r ~/data -t', 'imports text files in the folder, recursively'],
        ['import ~/data -s', 'simulates the process listing all involved files'],
        ['import backup.csv -e /imported', 'imports a backup creating files in the "/imported"'],
        ['import backup.json -e .', 'imports a backup in the current folder'],
        ['import backup.csv -e /', 'imports a backup in the root'],
        ['import backup.csv -t /', 'imports a backup saving the tags field as actual tags'],
        ['import backup.csv -ut /fromPasspack',
          'uses the tags to prefix the path and keeps the tags;',
          'ex: if "google" is tagged "web,email" the path becomes',
          '"./web/email/google" or "./email/web/google"',
          'based on the tag weight'
        ],
        ['import backup.csv -u /fromPasspack', 'uses the tags to prefix the path without saving the tags']
      ]
    }
  }

  async import(options = {}) {
    this.internalFs.tree.disableSave()
    let result = await this._import(options)
    this.internalFs.tree.enableSave()
    if (result.length && !options.simulate) {
      await this.internalFs.tree.save()
    }
    return result.sort()
  }

  async _import(options = {}, container = '') {
    let ifs = this.internalFs
    let efs = this.externalFs
    let p = efs.getNormalizedPath(options.path)
    if (await fs.pathExists(p)) {
      let isDir = await efs.isDir(p)
      let list = isDir ? (await efs.getDir(p))[1].map(f => path.join(p, f)) : [p]
      let content = []
      let result = []
      let moved = []
      for (let fn of list) {
        if (await efs.isDir(fn)) {
          if (options.recursive) {
            result = await this._import(
                Object.assign(options, {path: fn}),
                (container ? `${container}/` : '') + path.basename(fn)
            )
          } else {
            continue
          }
        }
        if (/\/$/.test(fn)) {
          continue
        }
        let isBinary = await Utils.isBinary(fn)

        if (isBinary && !options['binary-too']) {
          continue
        }
        content.push([fn, isBinary, await fs.readFile(fn, isBinary ? 'base64' : 'utf8')])
      }
      for (let fn of content) {
        let basename = Entry.sanitizeName(path.basename(fn[0]), '-')
        let name = await this.internalFs.tree.getVersionedBasename(basename)
        if (container) {
          name = container + '/' + name
        }
        result.push(this.internalFs.tree.getNormalizedPath(name))
        if (!options.simulate) {
          if (options.move) {
            moved.push(fn[0])
          }
          let node = await ifs.make({
            path: name,
            type: fn[1] ? config.types.BINARY : config.types.TEXT,
            content: fn[2]
          })
          result.pop()
          result.push(node.getPath())
        }
      }
      if (!options.simulate) {
        if (options.move) {
          for (let fn of moved) {
            await fs.unlink(fn)
          }
        }
      }
      return result
    } else {
      return []
    }
  }

  async expand(options) {
    let ifs = this.internalFs
    let efs = this.externalFs
    let fn = efs.getNormalizedPath(options.path)
    if (!(await fs.pathExists(fn))) {
      return this.Logger.red('The file does not exist')
    }
    let str = await fs.readFile(fn, 'utf-8')
    let ext = path.extname(fn)
    let data
    try {
      if (ext === '.json') {
        data = JSON.parse(str)
      } else if (ext === '.csv') {
        try {
          data = fromCsvToJson(str)
        } catch (e) {
          return this.Logger.red(e.message)
        }
      }
    } catch (e) {
      if (e.message === 'The header of the CSV looks wrong') {
        throw e
      } else {
        return this.Logger.red('The file has a wrong format')
      }
    }
    if (data.length === 0) {
      return this.Logger.red('The data is empty')
    }
    if (!data[0].path) {
      return this.Logger.red('The data misses a path field')
    }
    if (options['use-tags-for-paths']) {
      let weightedTags = {}
      for (let item of data) {
        if (item.tags) {
          let tags = item.tags.split(' ')
          for (let t of tags) {
            if (!weightedTags[t]) {
              weightedTags[t] = 0
            }
            weightedTags[t]++
          }
        }
      }
      for (let item of data) {
        if (item.tags) {
          let tags = item.tags.split(' ')
          item.path = tags.sort((a, b,) => {
            let A = weightedTags[a]
            let B = weightedTags[b]
            return A > B ? -1 : A < B ? 1 : 0
          }).join('/') + '/' + item.path
          if (!options.tags) {
            delete item.tags
          }
        }
      }
    }
    let extra = ''
    if (options.simulate) {
      extra = ' (simulation)'
    } else if (options.move) {
      extra = ' (moved)'
    }
    this.Logger.green(`Imported files${extra}:`)

    let parentFolderPath = this.internalFs.tree.getNormalizedPath(options.expand)
    let parentFolder
    try {
      parentFolder = this.internalFs.tree.root.getChildFromPath(parentFolderPath)
    } catch (e) {
      await this.prompt.commands.mkdir.mkdir({path: parentFolderPath, type: config.types.DIR})
      parentFolder = this.internalFs.tree.root.getChildFromPath(parentFolderPath)
    }
    if (!Node.isDir(parentFolder)) {
      return this.Logger.red('The destination folder is not a folder.')
    }
    this.internalFs.tree.disableSave()
    for (let item of data) {
      let p = item.path
      if (!p) {
        continue
      }
      p = path.resolve(parentFolderPath, p.replace(/^\//, ''))
      let dirname = path.dirname(p)
      let dir
      try {
        dir = this.internalFs.tree.root.getChildFromPath(dirname)
      } catch (e) {
        await this.prompt.commands.mkdir.mkdir({path: dirname, type: config.types.DIR})
        dir = this.internalFs.tree.root.getChildFromPath(dirname)
      }
      let name = path.basename(p)
      if (!isYaml(name)) {
        name += '.yml'
      }
      name = await this.internalFs.tree.getVersionedBasename(path.join(dirname, name), dir)
      this.Logger.reset(path.join(dirname, name))
      if (!options.simulate) {
        delete item.path
        let tags
        if (options.tags) {
          tags = item.tags
          delete item.tags
        }
        let node = await ifs.make({
          path: path.join(dirname, name),
          type: config.types.TEXT,
          content: yamlStringify(item)
        })
        if (tags) {
          tags = tags.split(' ').filter(e => e)
          await this.prompt.commands.tag.tag({add: tags}, [node])
        }
      }
    }
    if (!options.simulate) {
      this.internalFs.tree.enableSave()
      await this.internalFs.tree.save()
      if (options.tags) {
        await this.internalFs.tree.saveTags()
      }
      if (options.move) {
        await fs.unlink(fn)
      }
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
          this.Logger.green(`Imported files${extra}:`)
          this.Logger.reset(files.join('\n'))
        } else {
          this.Logger.red('No file has been imported.')
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Import


