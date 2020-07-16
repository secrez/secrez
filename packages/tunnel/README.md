# @secrez/tunnel

**_A fork of https://github.com/localtunnel/localtunnel with restricted functions in order to be used by Secrez_**

---

localtunnel exposes your localhost to the world to allow communication between machines.


## Installation

### Globally

```
npm i -g @secrez/tunnel
```

### As a dependency in your project

```
npm i @secrez/tunnel
```

## CLI usage

When localtunnel is installed globally, just use the `lt` command to start the tunnel.

```
lt --port 8000
```

Thats it! It will connect to the tunnel server, setup the tunnel, and tell you what url to use for your testing. This url will remain active for the duration of your session; so feel free to share it with others for happy fun time!

You can restart your local server all you want, `lt` is smart enough to detect this and reconnect once it is back.

### Arguments

Below are some common arguments. See `lt --help` for additional arguments

- `--subdomain` request a named subdomain on the localtunnel server (default is random characters)
- `--local-host` proxy to a hostname other than localhost

You may also specify arguments via env variables. E.x.

```
PORT=3000 lt
```

## API

The localtunnel client is also usable through an API (for test integration, automation, etc)

### localtunnel(port [,options][,callback])

Creates a new localtunnel to the specified local `port`. Will return a Promise that resolves once you have been assigned a public localtunnel url. `options` can be used to request a specific `subdomain`. A `callback` function can be passed, in which case it won't return a Promise. This exists for backwards compatibility with the old Node-style callback API. You may also pass a single options object with `port` as a property.

```js
const localtunnel = require('packages/tunnel/index');

(async () => {
  const tunnel = await localtunnel({ port: 3000 });

  // the assigned public url for your tunnel
  // i.e. https://abcdefg.secrez.cc
  tunnel.url;

  tunnel.on('close', () => {
    // tunnels are closed
  });
})();
```

#### options

- `port` (number) [required] The local port number to expose through localtunnel.
- `subdomain` (string) Request a specific subdomain on the proxy server. **Note** You may not actually receive this name depending on availability.
- `host` (string) URL for the upstream proxy server. Defaults to `https://secrez.cc`.
- `local_host` (string) Proxy to this hostname instead of `localhost`. This will also cause the `Host` header to be re-written to this value in proxied requests.
- `local_https` (boolean) Enable tunneling to local HTTPS server.
- `local_cert` (string) Path to certificate PEM file for local HTTPS server.
- `local_key` (string) Path to certificate key file for local HTTPS server.
- `local_ca` (string) Path to certificate authority file for self-signed certificates.
- `allow_invalid_cert` (boolean) Disable certificate checks for your local HTTPS server (ignore cert/key/ca options).

Refer to [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) for details on the certificate options.

### Tunnel

The `tunnel` instance returned to your callback emits the following events

| event   | args | description                                                                          |
| ------- | ---- | ------------------------------------------------------------------------------------ |
| request | info | fires when a request is processed by the tunnel, contains _method_ and _path_ fields |
| error   | err  | fires when an error happens on the tunnel                                            |
| close   |      | fires when the tunnel has closed                                                     |

The `tunnel` instance has the following methods

| method | args | description      |
| ------ | ---- | ---------------- |
| close  |      | close the tunnel |

## other clients

Clients in other languages

_go_ [gotunnelme](https://github.com/NoahShen/gotunnelme)

_go_ [go-localtunnel](https://github.com/localtunnel/go-localtunnel)

## server

See [localtunnel/server](//github.com/localtunnel/server) for details on the server that powers localtunnel.

## Test coverage
```
  5 passing (998ms)

---------------------------|---------|----------|---------|---------|-------------------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s             
---------------------------|---------|----------|---------|---------|-------------------------------
All files                  |   87.74 |    51.61 |   85.71 |   88.16 |                               
 tunnel                    |      75 |       40 |      75 |      80 |                               
  index.js                 |      75 |       40 |      75 |      80 | 8-9                           
 tunnel/src                |   88.81 |    53.85 |    87.1 |   88.73 |                               
  HeaderHostTransformer.js |     100 |       60 |     100 |     100 | 4-6                           
  Tunnel.js                |   87.14 |       50 |   88.24 |   86.96 | 65-68,73-74,94-95,126,142,150 
  TunnelCluster.js         |   89.23 |       56 |   81.82 |   89.23 | 45-58,72,76,111               
---------------------------|---------|----------|---------|---------|-------------------------------

```

## License

MIT