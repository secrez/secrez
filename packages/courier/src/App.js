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
    let owner = server.options.owner
    this.db = this.server.db

    app.use(bodyParser.json({limit: '100mb'}))

    const setOwner = async publicKey => {
      server.options.owner = publicKey
      await server.setOwner()
      owner = publicKey
    }

    const authMiddleware = async (req, res, next) => {
      let {publicKey} = req.parsedPayload
      if (!owner) {
        await setOwner(publicKey)
      }
      if (publicKey === owner) {
        next()
      } else {
        res.status(401).json({
          error: 'Unauthorized'
        })
      }
    }

    app.get('/admin',
        this.wellSignedGet,
        authMiddleware,
        async (req, res) => {
          let {action} = req.parsedPayload
          if (action && action.name) {
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
                if (Crypto.isValidSecrezPublicKey(action.recipient)) {
                  let url = await this.db.getTrustedPublicKeyUrl(action.recipient)
                  if (url) {
                    if (/http:.*\.localhost:/.test(url)) {
                      url = url.replace(/\.localhost:/, '.127zero0one.com:')
                    }
                    let message = action.message
                    // this are specifically for the message
                    let {payload, signature} = message
                    const params = {
                      payload,
                      signature
                    }
                    try {
                      let response = await superagent
                          .post(url)
                          .set('Accept', 'application/json')
                          .send(params)
                      await this.db.saveMessage(payload, signature, action.recipient, Db.TO)
                      res.json({
                        success: response.body.success
                      })
                    } catch (e) {
                      res.json({
                        success: false,
                        error: 'Not found on the hub'
                      })
                    }
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
        this.wellSignedGet,
        authMiddleware,
        async (req, res, next) => {
          let {minTimestamp, maxTimestamp, from, limit, direction} = req.parsedPayload
          if (!this.server.tunnelActive) {
            res.json({
              success: false,
              error: 2,
              message: 'Tunnel not active'
            })
          } else {
            let result = await this.db.getMessages(minTimestamp, maxTimestamp, from, limit, direction)
            res.json({
              success: true,
              result
            })
          }
        })

    app.post('/',
        this.wellSignedPost,
        async (req, res, next) => {
          let {payload, signature} = req.body
          let {publicKey} = req.parsedPayload
          if (this.db.isTrustedPublicKey(publicKey)) {
            await this.db.saveMessage(payload, signature, publicKey, Db.FROM)
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
