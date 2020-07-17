#!/usr/bin/env node

const pkg = require('../package')
const chalk = require('chalk')
const {Courier} = require('../src')
const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean
  },
  {
    name: 'hub',
    alias: 'H',
    type: String
  },
  {
    name: 'local',
    alias: 'l',
    type: String
  },
  {
    name: 'root',
    alias: 'r',
    type: String
  },
  {
    name: 'do-not-log',
    alias: 'd',
    type: Boolean
  },
  {
    name: 'new-auth-code',
    type: Boolean
  }
]

function error(message) {
  if (!Array.isArray(message)) {
    message = [message]
  }
  console.error(chalk.red(message[0]))
  if (message[1]) {
    console.info(message[1])
  }
  /*eslint-disable-next-line*/
  process.exit(1)
}

let options = {}
try {
  options = commandLineArgs(optionDefinitions, {
    camelCase: true
  })
} catch (e) {
  error(e.message)
}

options.host = options.host || 'https://secrez.cc'

console.info(chalk.bold.grey(`@secrez/courier v${pkg.version}`))

if (options.help) {
  console.info(`${pkg.description}

Options:
  -h, --help            This help.
  -H, --hub             The remote host (by default https://secrez.cc)
  -l, --local           The local hostname (by default localhost)
  -r, --root            Root folder (by default ~/.secrez-courier)
  -d, --do-not-log      Does not log on screen
  --new-auth-code       Refreshes the authCode, if a previous one's been saved
                          
By default, if not otherwise specified, it does not produce any log
                      
Examples:
  $ secrez-courier -h https://secrez.cc
  $ secrez-courier -h https://secrez.cc-r \`pwd\`/data     Uses ./data as root
  $ secrez-courier -h https://secrez.cc -d               Does not log in the terminal 
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}

(async () => {
  const courier = new Courier(options)
  await courier.start()
  console.info('Listening...')
  console.info('Auth code: ', chalk.bold(`${courier.server.authCode}-${courier.server.port}`))
  console.info(chalk.grey('You can copy the auth code and paste it in Secrez to connect the chat with the courier.'))
})()

