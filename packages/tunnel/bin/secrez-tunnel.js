#!/usr/bin/env node

const openurl = require("openurl");
const chalk = require("chalk");
const commandLineArgs = require("command-line-args");
const pkg = require("../package");
const localtunnel = require("..");

const optionDefinitions = [
  {
    name: "help",
    alias: "h",
    type: Boolean,
  },
  {
    name: "port",
    alias: "p",
    type: Number,
  },
  {
    name: "host",
    alias: "H",
    type: String,
  },
  {
    name: "host",
    alias: "H",
    type: String,
  },
  {
    name: "payload",
    type: String,
  },
  {
    name: "signature",
    type: String,
  },
  {
    name: "subdomain",
    alias: "s",
    type: String,
  },
  {
    name: "local-host",
    alias: "l",
    type: String,
  },
  {
    name: "local-https",
    type: String,
  },
  {
    name: "local-cert",
    type: String,
  },
  {
    name: "local-key",
    type: String,
  },
  {
    name: "local-ca",
    type: String,
  },
  {
    name: "allow-invalid-cert",
    type: Boolean,
  },
  {
    name: "open",
    type: Boolean,
  },
  {
    name: "print-requests",
    type: Boolean,
  },
];

function error(message) {
  if (!Array.isArray(message)) {
    message = [message];
  }
  console.error(chalk.red(message[0]));
  if (message[1]) {
    console.info(message[1]);
  }
  /*eslint-disable-next-line*/
  process.exit(1);
}

let options = {};
try {
  options = commandLineArgs(optionDefinitions, {
    camelCase: true,
  });
} catch (e) {
  error(e.message);
}

console.info(chalk.bold.grey(`Secrez-tunnel v${pkg.version}`));

if (options.help) {
  console.info(
    "reset",
    `${pkg.description}

Options:
  -h, --help              This help.
  -p, --port              Internal HTTP server port; default 443/SSL
  -H, --host              Upstream server providing forwarding.
  -l, --local-host        Tunnel traffic to this host instead of localhost, 
                          override Host header to this host               
  --local-https           Tunnel traffic to a local HTTPS server
  --local-cert            Path to certificate PEM file for local HTTPS server
  --local-key             Path to certificate key file for local HTTPS server
  --local-ca              Path to certificate authority file for self-signed certificates
  --allow-invalid-cert    Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)
  --open                  Opens the tunnel URL in your browser
  --print-requests        Print basic request info
                      
Examples:
  $ secrez-tunnel -p 9000 -H some-secrez-zub.com
`
  );
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

async function start(argv) {
  const tunnel = await localtunnel({
    port: argv.port,
    host: argv.host,
    local_host: argv.localHost,
    local_https: argv.localHttps,
    local_cert: argv.localCert,
    local_key: argv.localKey,
    local_ca: argv.localCa,
    allow_invalid_cert: argv.allowInvalidCert,
    signature: argv.signature,
    payload: argv.payload,
  }).catch((err) => {
    throw err;
  });

  tunnel.on("error", (err) => {
    throw err;
  });

  console.info("your url is: %s", tunnel.url);

  /**
   * `cachedUrl` is set when using a proxy server that support resource caching.
   * This URL generally remains available after the tunnel itself has closed.
   * @see https://github.com/localtunnel/localtunnel/pull/319#discussion_r319846289
   */
  if (tunnel.cachedUrl) {
    console.info("your cachedUrl is: %s", tunnel.cachedUrl);
  }

  if (argv.open) {
    openurl.open(tunnel.url);
  }

  if (argv["print-requests"]) {
    tunnel.on("request", (info) => {
      console.info(new Date().toString(), info.method, info.path);
    });
  }
}

start(options);
