const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {startHttpsServer, verifyTlsConnection} = require('./helpers')

const TLS = require('../src/TLS')
const Config = require('../src/Config')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#TLS', function () {

  let root = path.resolve(__dirname, '../tmp/test/.secrez-courier')
  let config
  let tls

  beforeEach(async function () {
    await fs.emptyDir(root)
    config = new Config({root: root})
  })

  describe('#constructor', async function () {


    it('should instantiate a new TLS', async function () {

      tls = new TLS(config)
      assert.equal(tls.config.options.root, root)

    })

  })

  describe('#init', async function () {

    it('should setup the environment', async function () {

      tls = new TLS(config)
      assert.isFalse(await tls.certificatesExist())
      assert.isTrue(await tls.generateCertificates())
      for (let file of TLS.ssls) {
        assert.isTrue(await fs.pathExists(path.join(root, 'ssl', file)))
      }
    })

    it('should get the tls and verify they are correct', async function () {

      tls = new TLS(config)
      assert.isFalse(await tls.certificatesExist())
      assert.isTrue(await tls.generateCertificates())

      const localhostCrt = await tls.getLocalhostCrt()
      const localhostKey = await tls.getLocalhostKey()
      const rootCAKey = await tls.getRootCACrt()

      let server = startHttpsServer(localhostKey, localhostCrt)
      let local = await verifyTlsConnection(localhostKey, localhostCrt, rootCAKey)
      assert.equal(local.toString(), 'hello world')
      server.close()

    })

  })
})
