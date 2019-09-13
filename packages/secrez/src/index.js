const pkg = require('../package')
const path = require('path')
const homedir = require('homedir')
const Logger = require('./utils/Logger')
const chalk = require('chalk')
const {Secrez, InternalFileSystem, version} = require('@secrez/core')
const config = require('./config')
const Prompt = require('./Prompt')

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean
  },
  {
    name: 'iterations',
    alias: 'i',
    type: Number
  },
  {
    name: 'container',
    alias: 'c',
    type: String
  }
]

function error(message) {
  if (!Array.isArray(message)) {
    message = [message]
  }
  Logger.red(message[0])
  if (message[1]) {
    Logger.log(message[1])
  }
  /*eslint-disable-next-line*/
  process.exit(1)
}

let options = {}
try {
  options = InternalFileSystem.parseCommandLine(optionDefinitions)
} catch (e) {
  error(e.message)
}

if (options.container) {
  options.container = options.container.replace(/\/+$/, '')
  if (!path.isAbsolute(options.container)) {
    if (/^~/.test(options.container)) {
      options.container = path.join(homedir(), options.container.substring(2))
    } else {
      error(['The path must be absolute or relative to home dir.',
        `If that path is relative to the current directory, you can absolutize it running, for example:
   secrez -c \`pwd\`/${options.container}      
      `])
    }
  }
}

Logger.log('bold', chalk.grey(`
Secrez v${pkg.version} (@secrez/core v${version})`))

if (options.help) {
  Logger.log('reset', `${pkg.description}

Options:
  -h, --help          This help.
  -c, --container     The data are saved in ~/.secrez by default. 
                      In you chose a directory different you must pass it 
                      anytime you run Secrez. The path must be absolute 
                      or relative to the home directory (~). If the folder 
                      does not exist, it will be created, included the parents.
  -i, --iterations    The number of iterations during password 
                      derivation (based on PBKDF2). It applies only at
                      account creation.
Examples:
  $ secrez
  $ secrez -p /var/my-secrets
  $ secrez -i 200000
`)
}

config.setPaths(options.container)

const secrez = new Secrez(options)
const prompt = new Prompt(secrez)

prompt.run()


