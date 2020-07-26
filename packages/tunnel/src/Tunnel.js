/* eslint-disable consistent-return, no-underscore-dangle */

const {EventEmitter} = require('events')
const request = require('superagent')
const {Debug} = require('@secrez/utils')
const debug = Debug('lt:client')

let globalOptions = {}

const TunnelCluster = require('./TunnelCluster')

class Tunnel extends EventEmitter {
  constructor(opts = {}) {
    super(opts)
    this.opts = opts
    if (opts.timeout) {
      globalOptions.timeout = opts.timeout
    }
    this.closed = false
  }

  _getInfo(body) {
    /* eslint-disable camelcase */
    const {id, ip, port, url, short_url, cached_url, max_conn_count} = body
    const {host, port: local_port, local_host, payload, signature} = this.opts
    const {local_https, local_cert, local_key, local_ca, allow_invalid_cert} = this.opts
    return {
      name: id,
      url,
      short_url,
      cached_url,
      max_conn: max_conn_count || 1,
      remote_host: new URL(host).hostname,
      remote_ip: ip,
      remote_port: port,
      local_port,
      local_host,
      local_https,
      local_cert,
      local_key,
      local_ca,
      allow_invalid_cert,
      payload,
      signature
    }
    /* eslint-enable camelcase */
  }

  // initialize connection
  // callback with connection info
  _init(cb) {
    const opt = this.opts
    const getInfo = this._getInfo.bind(this)

    let uri = `${opt.host}/api/v1/tunnel/new`
    let now = Date.now()

    function getUrl() {
      request
          .get(uri)
          .query({
            payload: opt.payload,
            signature: opt.signature
          })
          .set('Accept', 'application/json')
          .then(res => {
            const body = JSON.parse(res.text)
            debug('got tunnel information %s', body.url)
            if (res.status !== 200) {
              const err = new Error(
                  (body && body.message) || 'localtunnel server returned an error, please try again'
              )
              return cb(err)
            }
            cb(null, getInfo(body))
          })
          .catch(err => {
            if (!globalOptions.timeout || Date.now() - now < globalOptions.timeout * 1000) {
              debug(`tunnel server offline: ${err.message}, retry 1s`)
              return setTimeout(getUrl, 1000)
            } else {
              cb(null, {
                error: 'Timeout'
              })
            }
          })
    }

    getUrl()
  }

  _establish(info) {

    if (info.max_conn) {

      // increase max event listeners so that localtunnel consumers don't get
      // warning messages as soon as they setup even one listener. See #71
      this.setMaxListeners(info.max_conn + (EventEmitter.defaultMaxListeners || 10))

      this.tunnelCluster = new TunnelCluster(info, this)

      // only emit the url the first time
      this.tunnelCluster.once('open', () => {
        this.emit('url', info.url)
      })

      // re-emit socket error
      this.tunnelCluster.on('error', err => {
        debug('got socket error', err.message)
        this.emit('error', err)
      })

      let tunnelCount = 0

      // track open count
      this.tunnelCluster.on('open', tunnel => {
        tunnelCount++
        debug('tunnel open [total: %d]', tunnelCount)

        const closeHandler = () => {
          tunnel.destroy()
        }

        if (this.closed) {
          return closeHandler()
        }

        this.once('close', closeHandler)
        tunnel.once('close', () => {
          this.removeListener('close', closeHandler)
        })
      })

      // when a tunnel dies, open a new one
      this.tunnelCluster.on('dead', () => {
        tunnelCount--
        debug('tunnel dead [total: %d]', tunnelCount)
        if (this.closed) {
          return
        }
        this.tunnelCluster.open()
      })

      this.tunnelCluster.on('request', req => {
        this.emit('request', req)
      })

      // establish as many tunnels as allowed
      for (let count = 0; count < info.max_conn; ++count) {
        this.tunnelCluster.open()
      }

    } else {

      debug('unable to establish the connection. Closing the tunnel')
      this.emit('close')
    }
  }

  open(cb) {
    this._init((err, info) => {
      if (err) {
        return cb(err)
      }
      this.clientId = info.name
      this.url = info.url
      this.short_url = info.short_url

      // `cached_url` is only returned by proxy servers that support resource caching.
      if (info.cached_url) {
        this.cachedUrl = info.cached_url
      }

      this._establish(info)
      cb()
    })
  }

  close() {
    this.closed = true
    this.emit('close')
  }
}


module.exports = Tunnel
