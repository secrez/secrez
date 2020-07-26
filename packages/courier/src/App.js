const express = require('express')
const bodyParser = require('body-parser')
const {Crypto} = require('@secrez/core')
const {Debug} = require('@secrez/utils')
const superagent = require('superagent')
const debug = Debug('courier:app')
const {utils: hubUtils} = require('@secrez/hub')
const {verifyPayload} = hubUtils
const Db = require('./Db')

function verifyPayloadAndSignature(req, prop) {
  let {payload, signature} = req[prop]
  if (payload && signature && verifyPayload(payload, signature)) {
    req.parsedPayload = JSON.parse(payload)
    return true
  }
}

class App {

  constructor(server) {

    this.server = server
    const app = express()
    let authCode = server.authCode
    this.db = this.server.db

    app.use(bodyParser.json({limit: '100mb'}))

    const authMiddleware = (req, res, next) => {
      if (req.headers['auth-code'] === authCode) {
        next()
      } else {
        res.status(401).json({
          error: 'Unauthorized'
        })
      }
    }

    app.get('/admin',
        authMiddleware,
        this.wellSignedGet,
        async (req, res) => {
          let {action, publicKey, url} = req.parsedPayload
          if (!this.owner) {
            await this.setOwner(publicKey)
          }
          if (this.owner !== publicKey) {
            return res.status(403).end()
          } else if (action && action.name) {
            switch (action.name) {
              case 'ready': {
                res.json({
                  success: true,
                  caCrt: await this.server.tls.getCa(),
                  tunnel: this.server.tunnelActive ? {
                    clientId: this.server.tunnel.clientId,
                    url: this.server.tunnel.url,
                    short_url: this.server.tunnel.short_url
                  } : {}
                })
                break
              }
              case 'publish': {
                let {payload, signature} = req.query
                const info = await this.server.publish(payload, signature)
                res.json({
                  success: true,
                  info
                })
                break
              }
              case 'add': {
                let result
                if (Crypto.isValidSecrezPublicKey(action.publicKey)) {
                  result = await this.db.trustPublicKey(action.publicKey, action.url)
                }
                res.json({
                  success: true,
                  result
                })
                break
              }
              case 'send': {
                let result
                if (Crypto.isValidSecrezPublicKey(action.publicKey)) {
                  let url = await this.db.getTrustedPublicKeyUrl(action.publicKey)
                  if (url) {
                    let message = action.message
                    // this are specifically for the message
                    let {payload, signature} = message
                    const params = {
                      payload,
                      signature
                    }
                    let response = await superagent.post(url)
                        .set('Accept', 'application/json')
                        .send(params)
                    res.json({
                      success: response.body.success
                    })
                  }
                } else {
                  res.json({
                    success: false,
                    error: 'No url found for the public key'
                  })
                }
              }
            }
          } else {
            res.status(400).end()
          }
        })

    app.get('/',
        async (req, res, next) => {
          res.json({
            hello: 'world'
          })
        })

    app.get('/messages',
        authMiddleware,
        this.wellSignedGet,
        async (req, res, next) => {
          let {minTimestamp, maxTimestamp, from, publicKey, limit} = req.parsedPayload
          if (this.owner !== publicKey) {
            res.status(403).end()
          } else if (!this.server.tunnelActive) {
            res.json({
              success: false,
              error: 2,
              message: 'Tunnel not active'
            })
          } else {
            let result = await this.db.getMessages(minTimestamp, maxTimestamp, from, limit)
            res.json({
              success: true,
              result
            })
          }
        })

    app.post('/',
        this.wellSignedPost,
        async (req, res, next) => {
          let {message, publicKey} = req.parsedPayload
          if (this.db.isTrustedPublicKey(publicKey)) {
            await this.db.saveMessage(message, publicKey, Db.FROM)
            res.json({
              success: true
            })
          } else {
            res.status(400).end()
          }
        })

    app.use((req, res, next) => {
      const err = new Error('Not Found')
      err.status = 404
      next(err)
    })

    if (/^dev/i.test(app.get('env'))) {
      app.use((err, req, res, next) => {
        res.status(err.status || 500).json({
          title: 'Error',
          message: err.message,
          error: err
        })
      })
    }

    app.use((err, req, res, next) => {
      debug('ERROR', err.status)
      debug('ERROR', err.message)
      res.status(err.status || 500).json({
        error: 'Error'
      })
    })

    this.app = app
  }

  async setOwner(publicKey) {
    let owner = await this.db.getValueFromConfig('owner')
    if (owner && owner !== publicKey) {
      throw new Error('This courier has been set up by another user')
    } else {
      await this.db.saveKeyValueToConfig('owner', publicKey)
    }
    this.owner = publicKey
  }

  wellSignedGet(req, res, next) {
    if (verifyPayloadAndSignature(req, 'query')) {
      next()
    } else {
      res.status(400).json({
        error: 'Bad request'
      })
    }
  }

  wellSignedPost(req, res, next) {
    if (verifyPayloadAndSignature(req, 'body')) {
      next()
    } else {
      res.status(400).json({
        error: 'Bad request'
      })
    }
  }

}


module.exports = App
