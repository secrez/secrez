const pkg = require('../package')
const path = require('path')
const homedir = require('homedir')
const Logger = require('./utils/Logger')
const chalk = require('chalk')
const {version} = require('@secrez/core')
const Prompt = require('./Prompt')
const commandLineArgs = require('command-line-args')

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
  },
  {
    name: 'saveIterations',
    alias: 's',
    type: Boolean
  },
  {
    name: 'fix',
    alias: 'x',
    type: Boolean
  },
  {
    name: 'localDir',
    alias: 'l',
    type: String
  },
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
  options = commandLineArgs(optionDefinitions)
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

if (!options.localDir) {
  options.localDir = homedir()
}

Logger.log('bold', chalk.grey(`
Secrez v${pkg.version}`), 'grey',`(@secrez/core v${version})`)

if (options.help) {
  Logger.log('reset', `${pkg.description}

Options:
  -h, --help            This help.
  -c, --container       The data are saved in ~/.secrez by default. 
                        In you chose a different directory you must pass it 
                        anytime you run Secrez. The path must be absolute 
                        or relative to the home directory (~). If the folder 
                        does not exist, it will be created, included the parents.
  -i, --iterations      The number of iterations during password 
                        derivation (based on PBKDF2). Use a number like
                        94543 or 725642 (the larger the safer, but also the slower).
                        It increases exponentially the safety of your password.
  -s, --saveIterations  Saves the number of iterations in .env.json (which 
                        is .gitignored). Do it only if you computer is very safe.               
  -x, --fix             Fix the tree in case files are missing or corrupted.  
  -l, --localDir        The local (out of the enctrypted fs) working dir
                      
Examples:
  $ secrez
  $ secrez -p /var/my-secrets -i 787099 -l ~/Desktop
  $ secrez -si 1213672
  $ secrez --fix
`)
}

(async () => {
  const prompt = new Prompt
  await prompt.init(options)
  prompt.run(options)
})()

