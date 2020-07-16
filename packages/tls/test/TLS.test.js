const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {startHttpsServer, verifyTlsConnection} = require('./helpers')

const TLS = require('../src/TLS')

describe('#TLS', function () {

  let destination = path.resolve(__dirname, '../tmp/test/destination')
  let tls

  beforeEach(async function () {
    await fs.emptyDir(destination)
  })

    it('should instantiate a new TLS', async function () {

      tls = new TLS({
        destination
      })
      assert.equal(tls.options.destination, destination)
    })

    it('should setup the environment', async function () {

      tls = new TLS({
        destination
      })
      assert.isFalse(await tls.certificatesExist())
      assert.isTrue(await tls.generateCertificates())
      assert.isTrue(await fs.pathExists(path.join(destination, 'localhost.crt')))
      assert.isTrue(await fs.pathExists(path.join(destination, 'localhost.key')))
      assert.isTrue(await fs.pathExists(path.join(destination, 'ca.crt')))
    })

    it('should get the tls and verify they are correct', async function () {

      tls = new TLS({
        destination
      })
      assert.isFalse(await tls.certificatesExist())
      assert.isTrue(await tls.generateCertificates())

      assert.isTrue(await tls.certificatesExist())
      const localhostCrt = await tls.getCert()
      const localhostKey = await tls.getKey()
      const rootCAKey = await tls.getCa()

      let server = startHttpsServer(localhostKey, localhostCrt)
      let local = await verifyTlsConnection(localhostKey, localhostCrt, rootCAKey)
      assert.equal(local.toString(), 'hello world')
      server.close()

    })

  it('should throw is params are missing or wrong', async function () {

    try {
      tls = new TLS({
        destination: null
      })
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'A folder where to save the data is required')
    }

    try {
      tls = new TLS({
        destination,
        v3ext: 'casdasdasasdasd'
      })
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'The v3ext file does not exist')
    }

    await fs.emptyDir(destination)

    try {
      tls = new TLS({
        destination,
        name: '"'
      })
      await tls.generateCertificates()
      assert.isTrue(false)
    } catch(e) {
      assert.equal(e.message, 'Something went wrong. Check your params')
    }


  })
})
