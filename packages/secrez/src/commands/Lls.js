const {FsUtils} = require('@secrez/fs')

class Lls extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.lls = {
      _func: this.selfCompletion(this, {
        external: true
      }),
      _self: this
    }
    this.cliConfig.completion.help.lls = true
    this.optionDefinitions = [
      {
        name: 'help',
        alias: 'h',
        type: Boolean
      },
      {
        name: 'path',
        completionType: 'file',
        alias: 'p',
        defaultOption: true,
        type: String
      },
      {
        name: 'list',
        alias: 'l',
        type: Boolean
      },
      {
        name: 'all', // includes hidden files
        alias: 'a',
        type: Boolean
      },
      {
        name: 'dironly', // has priority on fileonly
        alias: 'd',
        type: Boolean
      },
      {
        name: 'fileonly',
        alias: 'f',
        type: Boolean
      }
    ]
  }

  help() {
    return {
      description: ['Browses the external directories.',
        'This is a quick command. Alternatively, you can run commands like',
        '  shell "ls -la"'
      ],
      examples: [
        'lls coin',
        'lls -l ../passwords',
        'lls ~',
        ['lls -a', 'Shows all the file, included hidden ones']
      ]
    }
  }

  async lls(options) {
    options.returnIsDir = true
    let [isDir, list] = await this.externalFs.fileList(options)
    if (!isDir) {
      list = await FsUtils.filterLs(options, list)
    }
    return list
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp()
    }
    try {
      this.validate(options)
      let list = await this.lls(options)
      if (list) {
        if (list.length) {
          this.Logger.reset(options.list
              ? list.join('\n')
              : this.prompt.commandPrompt.formatList(list, 26, true, this.threeRedDots())
          )
        } else {
          this.Logger.yellow('-- no files found --')
        }
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    await this.prompt.run()
  }
}

module.exports = Lls



