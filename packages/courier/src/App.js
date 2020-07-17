const express = require('express')
const bodyParser = require('body-parser')
const {Secrez} = require('@secrez/core')
const {Debug} = require('@secrez/utils')
const debug = Debug('courier:app')
const {utils: hubUtils} = require('@secrez/hub')
const {verifyPayload} = hubUtils

let authCode

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
    authCode = server.authCode
    this.db = this.server.db

    app.use(bodyParser.json({limit: '100mb'}))

    app.get('/admin',
        this.authMiddleware,
        this.wellSignedGet,
        async (req, res) => {
          let {action, publicKey} = req.parsedPayload
          if (!this.owner) {
            await this.setOwner(publicKey)
          }
          if (this.owner !== publicKey) {
            return res.status(403).end()
          } else if (action && action.name) {
            switch (action.name) {

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
                let wrongKeys
                for (let pk of action.publicKeys) {
                  if (!Secrez.isValidPublicKey(pk)) {
                    if (!wrongKeys) {
                      wrongKeys = []
                    }
                    wrongKeys.push(pk)
                    continue
                  }
                  await this.db.trustPublicKey(publicKey)
                }
                res.json({
                  success: true,
                  wrongKeys
                })
              }
            }
          } else {
            res.status(400).end()
          }
        })

    app.get('/',
        this.authMiddleware,
        this.wellSignedGet,
        async (req, res, next) => {
          let {minTimestamp, maxTimestamp, from, publicKey} = req.parsedPayload
          if (this.owner !== publicKey) {
            res.status(403).end()
          } else {
            let result = await this.db.getMessages(minTimestamp, maxTimestamp, from)
            res.json({
              success: true,
              result
            })
          }
        })

    app.post('/',
        this.wellSignedPost,
        async (req, res, next) => {
          const {message, publicKey} = req.parsedPayload
          if (this.db.isTrustedPublicKey(publicKey)) {
            await this.db.saveMessage(message, publicKey)
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

  authMiddleware(req, res, next) {
    if (req.headers['auth-code'] === authCode) {
      next()
    } else {
      res.status(401).json({
        error: 'Unauthorized'
      })
    }
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
