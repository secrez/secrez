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
  },
  {
    name: 'new-random-port',
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
  -r, --root            Root folder (by default ~/.secrez-courier)
  -d, --do-not-log      Does not log on screen
  --new-auth-code       Refreshes the authCode, if a previous one's been saved
  --new-random-port     Force the refresh of a new random port (modifying the auth-code)
                          
Everytime you change auth-code or port, you must re-init the courier in Secrez. If not, Secrez cannot find the listening courier. 
                      
Examples:
  $ secrez-courier                          All defaults (uses secrez.cc as remote hub)
  $ secrez-courier -H https://example.org   Uses example.org as remote hub
  $ secrez-courier -r \`pwd\`/data            Uses ./data as root
  $ secrez-courier -d                       Does not log in the terminal 
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}

(async () => {
  const courier = new Courier(options)
  await courier.start()
  console.info('Courier listening...')
  console.info('Auth-Code: ', chalk.bold(`${courier.server.authCode}${courier.server.port}`))
  console.info(chalk.grey('Copy the Auth-Code and paste it in Secrez using "conf --init-courier" to initiate the chat'))
})()

