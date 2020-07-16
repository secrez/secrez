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
                  await this.db.trustPublicKey(publicKey)
                }
                res.json({
                  success: true,
                  wrongKeys
                })
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
            //
            // // let query =
            //
            //
            // // let allMessages = this.server.cache.get('message')
            //
            //
            // let keys = Object.keys(allMessages).filter(key => {
            //   if (from !== 0) {
            //     let ok = false
            //     for (let pk of from) {
            //       if (this.messageKeyFrom(key, pk)) {
            //         ok = true
            //         break
            //       }
            //     }
            //     if (!ok) {
            //       return false
            //     }
            //   }
            //   if (since !== 0 && !this.messageKeySince(key, since)) {
            //     return false
            //   }
            //   return true
            // })
            // keys.sort((a, b) => {
            //   let A = base58ToInt(a.substring(20))
            //   let B = base58ToInt(b.substring(20))
            //   return A > B ? 1 : A < B ? -1 : 0
            // })
            //
            // let result = []
            // let latestByKey = {}
            // for (let key of keys) {
            //   result.push(allMessages[key])
            // }
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
            let result = await this.db.saveMessage(message, publicKey)
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
    if (owner[0] && owner[0].value) {
      if (owner[0].value !== publicKey) {
        throw new Error('This courier has been set up by another user')
      }
    } else {
      await this.db.saveKeyValueToConfig('owner', publicKey)
    }
    this.owner = publicKey
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
