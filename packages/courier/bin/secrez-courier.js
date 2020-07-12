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
    name: 'port',
    alias: 'p',
    type: Number
  },
  {
    name: 'host',
    type: String
  },
  {
    name: 'root',
    alias: 'r',
    type: String
  },
  {
    name: 'print-log',
    type: Boolean
  },
  {
    name: 'log-to-file',
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
options.port = options.port || 4433

console.info(chalk.bold.grey(`@secrez/courier v${pkg.version}`))


if (options.help) {
  console.info(`${pkg.description}

Options:
  -h, --help            This help.
  -p, --port            The port where to listen (default is 4433)
  -h, --host            The host. By default it is https://secrez.cc
  -r, --root            Root folder (by default ~/.secrez-listener)
  --print-log           Show the log on screen
  --log-to-file         The absolute path of the folder where to log 
                          
By default, if not otherwise specified, it does not produce any log
                      
Examples:
  $ secrez-listener                         Listen on default port 4433+ 
  $ secrez-listener --port 8800             Listen on default port 8800
  $ secrez-listener --port 8800             Listen on default port 8800
  $ secrez-listener -r \`pwd\`/data           Listen to 9393 and uses ./data as root
  $ secrez-listener -p 8000 --print-log     Listen to 8000 and log in the terminal 
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}

(async () => {
  const courier = new Courier(options)
  await courier.start()
  console.info(`Listening to: ${courier.server.host}`)
  console.info(`Auth code: ${courier.server.authCode}`)
})()

