const express = require('express')
const bodyParser = require('body-parser')
// const expressWs = require('express-ws')
// const WebSocket = require('ws')
const {Crypto, Secrez} = require('@secrez/core')
const {Debug, intToBase58, base58ToInt} = require('@secrez/utils')
const {DataCache} = require('@secrez/fs')
const debug = Debug('courier:app')
const pkg = require('../package.json')
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

    app.use(bodyParser.json({limit: '100mb'}))

    app.get('/admin',
        this.authMiddleware,
        this.wellSignedGet,
        async (req, res) => {
          let {action} = req.parsedPayload
          if (action && action.name) {
            switch (action.name) {

              case 'publish':
                let {payload, signature} = req.query
                const tunnelUrl = await this.server.publish(payload, signature)
                res.json({
                  success: true,
                  tunnelUrl
                })
                break

              case 'add':
                let wrongKeys
                for (let pk of action.publicKeys) {
                  if (!Secrez.isValidPublicKey(pk)) {
                    if (!wrongKeys) {
                      wrongKeys = []
                    }
                    wrongKeys.push(pk)
                    continue
                  }
                  await this.server.cache.puts('publickey', {
                    value: pk
                  })
                }
                res.json({
                  success: true,
                  wrongKeys
                })
            }
          } else {
            res.json({
              success: false,
              message: 'Wrong action'
            })
          }
        }
    )

    app.get('/',
        this.authMiddleware,
        this.wellSignedGet,
        async (req, res, next) => {
          let {since, from} = req.parsedPayload
          let allMessages = this.server.cache.get('message')
          let keys = Object.keys(allMessages).filter(key => {
            if (from !== 0) {
              let ok = false
              for (let pk of from) {
                if (this.messageKeyFrom(key, pk)) {
                  ok = true
                  break
                }
              }
              if (!ok) {
                return false
              }
            }
            if (since !== 0 && !this.messageKeySince(key, since)) {
              return false
            }
            return true
          })
          keys.sort((a, b) => {
            let A = base58ToInt(a.subtring(20))
            let B = base58ToInt(b.subtring(20))
            return A > B ? 1 : A < B ? -1 : 0
          })

          let result = []
          for (let key of keys) {
            result.push(allMessages[key])
          }
          res.json({
            success: true,
            result
          })
        }
    )

    app.post('/',
        this.wellSignedPost,
        async (req, res, next) => {
          const {message, publicKey} = req.parsedPayload
          if (this.server.cache.get('publickey', publicKey)) {
            const now = Date.now()
            const content = JSON.stringify({
              receivedAt: now,
              message,
              publicKey
            })
            let value = this.messageKey(publicKey, content, now)
            await this.server.cache.puts('message', {
              value,
              content
            })
            res.json({
              success: true,
              value
            })
          } else {
            res.status(400).json({
              error: 'Untrusted public key'
            })
          }
        }
    )

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

  messageKey(publicKey, content, now) {
    return Crypto.b58Hash(publicKey, 16) + Crypto.b58Hash(content, 4) + now
  }

  messageKeyFrom(key, from) {
    return key.substring(0, 16) === Crypto.b58Hash(from, 16)
  }

  messageKeySince(key, since) {
    return parseInt(key.substring(20)) >= since
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

  async filter(publicKey) {
    let all = this.server.cache.get('publickey')
    console.log(all)
  }


}


module.exports = App
