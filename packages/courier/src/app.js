const express = require('express')
const expressWs = require('express-ws')
const {Debug} = require('@secrez/utils')
const {DataCache} = require('@secrez/fs')
const debug = Debug('courier:app')
const pkg = require('../package.json')

module.exports = authCode => {

  const authMiddleware = (req, res, next) => {
    if (req.headers['auth-code'] !== authCode) {
      res.status(403)
      res.json({
        code: 403,
        message: 'Not authorized'
      })
    }
    next()
  }

  const app = express()
  expressWs(app)

  app.get('/admin', authMiddleware, function (req, res, next) {
    if (req.query.authorizedPublicKey) {
      res.json({
        ok: true
      })
    } else {
      res.status(400)
      res.json({
        code: 400,
        message: 'Bad request'
      })
    }
  })

  app.get('/', function (req, res, next) {
    if (req.query.payload && req.query.signature) {
      res.json({
        ok: true
      })
    } else {
      res.json({
        welcome_to: 'Secrez Courier v' + pkg.version
      })
    }
  })

  app.ws('/', function (ws, req) {
    ws.on('message', function (msg) {
      debug(msg)
    })
    debug('socket', req.testing)
  })

  app.use(function (req, res, next) {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
  })

  const isDev = /^dev/i.test(app.get('env'))

  if (isDev) {
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        title: 'Error',
        message: err.message,
        error: err
      })
    })
  }

  app.use(function (err, req, res, next) {
    // debug('ERROR', err)
    debug('ERROR', err.status)
    debug('ERROR', err.message)
    // res.locals.message = err.message
    // res.locals.error = isDev ? err : {}
    res.status(err.status || 500)
    res.json({
      code: err.status || 500,
      error: 'Error'
    })
  })

  return app
}
