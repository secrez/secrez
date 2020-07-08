const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
// const Fastify = require('fastify')
// const fastifyWebsocket = require('fastify-websocket')
// const WebSocket = require('ws')
// const get = require('http').get

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe.skip('#Command', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez-courier')

  beforeEach(async function () {
    await fs.emptyDir(rootDir)

  })

  describe('#constructor', async function () {


    it('should setup the environment', async function () {

      let Courier = new Courier(prompt)
      assert.isTrue(Array.isArray([]))
    })

  })
})
