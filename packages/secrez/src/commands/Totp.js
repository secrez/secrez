const {authenticator} = require('otplib')
const path = require('path')
const fs = require('fs-extra')
const {execSync} = require('child_process')
const {isYaml, yamlParse, yamlStringify, execAsync, TRUE} = require('../utils')
const {Node} = require('@secrez/fs')
const QrCode = require('qrcode-reader')
const Jimp = require('jimp')

class Totp extends require('../Command') {

  setHelpAndCompletion() {
    this.cliConfig.completion.totp = {
      _func: this.selfCompletion(this),
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
      },
      {
        name: 'no-beep',
        type: Boolean
      },
      {
        name: 'from-clipboard',
        alias: 'c',
        type: Boolean
      },
      {
        name: 'from-image',
        alias: 'i',
        type: String
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
        ['totp github.yml --from-clipboard', 'get a secret from a qr code copied in the clipboard and add a field "totp" with the secret in "github.yml"'],
        ['totp github.yml --from-image qrcode.png', 'get a secret from the image']
      ]
    }
  }

  async isImagePasteSupported() {
    /* istanbul ignore if  */
    if (TRUE()) {
      let result
      switch (process.platform) {
        case 'darwin':
          result = await execAsync('which', __dirname, ['pngpaste'])
          if (!result || result.code === 1) {
            throw new Error('pngpaste is required. Run "brew install pngpaste" in another terminal to install it')
          }
          break
        case 'win32':
          throw new Error('Operation not supported on Windows')
        default:
          result = await execAsync('which', __dirname, ['xclip'])
          if (!result || result.code === 1) {
            throw new Error('xclip is required. On Debian/Ubuntu you can install it with "sudo apt install xclip"')
          }
      }
    }
  }

  async readFromClipboard(options) {
    /* istanbul ignore if  */
    if (TRUE()) {
      await this.isImagePasteSupported()
      let p = path.resolve(this.secrez.config.tmpPath, 'image.png')
      let result
      switch (process.platform) {
        case 'darwin':
          result = await execAsync('pngpaste', __dirname, [p])
          if (result.error) {
            if (/target image\/png not available/.test(result.error)) {
              throw new Error('The clipboard does not contain an image')
            }
            throw new Error(result.error)
          }
          break
        default:
          try {
            result = execSync(`xclip -selection clipboard -t image/png -o > ${p}`).toString()
          } catch (e) {
            throw new Error('Wrong content in the clipboard')
          }
      }
      return p
    }
  }

  async readFromImage(options) {
    let p = this.externalFs.getNormalizedPath(options.fromImage)
    const buffer = await fs.readFile(p)
    return new Promise((resolve, reject) => {
      Jimp.read(buffer, (err, image) => {
        if (err) {
          reject(err.message)
        }
        const qr = new QrCode()
        qr.callback = (err, value) => {
          /* istanbul ignore if  */
          if (err) {
            reject(err.message)
          }
          resolve(value.result)
        }
        try {
          qr.decode(image.bitmap)
        } catch (e) {
          reject(e.message)
        }
      })
    })
  }

  async totp(options = {}) {
    let secret
    let originalPath = options.path
    if (options.fromImage || options.fromClipboard) {
      /* istanbul ignore if  */
      if (options.fromClipboard) {
        options.fromImage = await this.readFromClipboard(options)
      }
      try {
        let result = await this.readFromImage(options)
        secret = result.split('secret=')[1].split('&')[0]
      } catch (e) {
        throw new Error('The file does not look like a valid 2FA QR code')
      }
    }
    let err = 'The file is not a card with a totp field'
    let currentIndex = this.internalFs.treeIndex
    let data = await this.internalFs.getTreeIndexAndPath(options.path)
    /* istanbul ignore if  */
    if (currentIndex !== data.index) {
      await this.internalFs.mountTree(data.index, true)
    }
    if (secret && !originalPath) {
      return `The secret in the QR Code is "${secret}"`
    }
    options.path = data.path
    let tree = data.tree
    let p = tree.getNormalizedPath(options.path)
    let node = tree.root.getChildFromPath(p)
    if (Node.isFile(node)) {
      let entry = (await this.prompt.commands.cat.cat({
        path: p,
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
          if (secret) {
            parsed.totp = secret
            let entry = node.getEntry()
            entry.set('content', yamlStringify(parsed))
            await this.internalFs.tree.update(node, entry)
            return [
              'A totp field has been successfully created.',
              `Try it, running "totp ${node.getPath()}"`
            ].join('\n')
          } else {
            let totp = parsed.totp
            if (totp) {
              const token = authenticator.generate(totp)
              this.prompt.commands.copy.copy({
                thisString: token,
                duration: [options.duration || 5],
                noBeep: options.noBeep
              })
              return token
            }
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
      if (options.fromImage || options.fromClipboard) {
        this.Logger.grey(token)
      } else {
        this.Logger.grey('TOTP token: ' + this.chalk.bold.black(token))
        this.Logger.grey(`It will stay in the clipboard for ${options.duration || 5} seconds`)
      }
    } catch (e) {
      this.Logger.red(e.message)
    }
    this.prompt.run()
  }
}

module.exports = Totp


