#!/usr/bin/env node

const pkg = require('../package')
const chalk = require('chalk')
const {TLS} = require('../src')
const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean
  },
  {
    name: 'destination',
    alias: 'd',
    defaultValue: true,
    type: String
  },
  {
    name: 'authority',
    alias: 'a',
    type: String
  },{
    name: 'name',
    alias: 'n',
    type: String
  },{
    name: 'city',
    alias: 'c',
    type: String
  },{
    name: 'organization',
    alias: 'o',
    type: String
  },{
    name: 'destination',
    alias: 'd',
    type: String
  },{
    name: 'v3ext',
    alias: 'v',
    type: String
  },{
    name: 'ca',
    alias: 'c',
    type: String
  },
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
  -d, --destination     The folder where to put the certificates
  -a, --authority       The name of the authority
  -n, --name            The name of the domain and of the cert, for example localhost.crt
  -s, --state      
  -c, --city       
  -o, --organization
  -v, --v3ext           A v3.ext file different from the default one
  -c, --ca              The basename of, for example, ca.crt
                          
Defaults:

  authority:     Secrez-Root-CA
  name:          localhost            > localhost.key, localhost.crt
  state:         California
  city:          San Francisco
  organization:  Secrez-Certificates
  v3ext:         ../v3.ext
  ca:            ca                   > ca.crt
                      
Examples:
  $ secrez-tls   \`pwd\`/ssl
   
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}

(async () => {
  console.info(`Generating new self-signed certificates in ${options.destination}`)
  const tls = new TLS(options)
  await tls.generateCertificates()
  console.info('Done')
})()

