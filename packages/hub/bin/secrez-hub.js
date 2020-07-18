#!/usr/bin/env node

const chalk = require('chalk')
const commandLineArgs = require('command-line-args')
const pkg = require('../package')
const {startServer} = require('..')

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
    name: 'secure',
    alias: 's',
    type: Boolean
  },
  {
    name: 'domain',
    alias: 'd',
    type: String
  },
  {
    name: 'landing',
    alias: 'l',
    type: String
  },
  {
    name: 'address',
    alias: 'a',
    type: String
  },
  {
    name: 'max-sockets',
    alias: 'm',
    type: Number
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

console.info(chalk.bold.grey(`Secrez-hub v${pkg.version}`))

if (options.help) {
  console.info('reset', `${pkg.description}

Options:
  -h, --help              This help.
  -p, --port              Listen on this port for outside requests; default: 4433.
  -s, --secure            Use this flag to indicate proxy over https.
  -l, --landing           The url of the landing page, if any.               
  -a, --address           IP address to bind to.
  -d, --domain            Specify the base domain name. This is optional if hosting 
                          from a regular example.com domain. It is required if hosting 
                          a hub from a subdomain (i.e. lt.example.dom where clients 
                          will be huw7y3dl.lt.example.com); default: secrez.cc.
  -m, --max-sockets       Maximum number of tcp sockets each client is allowed 
                          to establish at one time (the tunnels); default: 4.           
                      
Examples:
  $ secrez-hub -p 9494
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}

(async function () {
  const port = await startServer(options)
  console.log(`Hub listening on port ${port}`)
})()
